import Database from "tauri-plugin-sql-api";
import { invoke } from '@tauri-apps/api/tauri';
import { appDataDir } from '@tauri-apps/api/path';
import { v4 as uuidv4 } from 'uuid';
import { TimeBox, SessionEvent, Session } from './types';

let cachedDevMode: boolean | null = null;
let dbInstance: Database | null = null;
let currentTransaction: Database | null = null;

const TABLES = {
  TIME_BOXES: 'timeBoxes',
  SESSIONS: 'sessions',
  SESSION_EVENTS: 'sessionEvents',
  METADATA: 'metadata'
};

async function checkDevMode(): Promise<boolean> {
  if (cachedDevMode === null) {
    cachedDevMode = await invoke('is_dev');
  }
  return cachedDevMode ?? false;
}

async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const isDev = await checkDevMode();
  const dbName = isDev ? 'clockblocks_dev.db' : 'clockblocks.db';
  const dbPath = `sqlite:${dbName}`;

  try {
    dbInstance = await Database.load(dbPath);
    return dbInstance;
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

async function isTableEmpty(db: Database, tableName: string): Promise<boolean> {
  const result = await db.select<[{ count: number }]>(`SELECT COUNT(*) as count FROM ${tableName}`);
  return result[0].count === 0;
}

async function executeQuery(db: Database, query: string, params: any[] = []): Promise<void> {
  try {
    await db.execute(query, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function maybeInitializeDatabase() {
  const db = await getDatabase();
  if (!db) {
    console.log('Database connection not established');
    return;
  }

  const fullDbPath = await getActualDbPath();
  console.log('Full database file system path:', fullDbPath);

  const tablesExist = await db.select<[{ count: number }]>(`
    SELECT COUNT(*) as count 
    FROM sqlite_master 
    WHERE type='table' AND name IN ('${TABLES.TIME_BOXES}', '${TABLES.SESSION_EVENTS}', '${TABLES.METADATA}', '${TABLES.SESSIONS}')
  `);

  if (tablesExist[0].count > 0) {
    console.log('Existing tables found');
    return;
  }

  console.log('No existing tables found');

  await executeQuery(db, `
    CREATE TABLE IF NOT EXISTS ${TABLES.TIME_BOXES} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isHidden BOOLEAN DEFAULT FALSE,
      isDeleted BOOLEAN DEFAULT FALSE,
      colour TEXT NOT NULL DEFAULT '#D82726'
    )
  `);

  await executeQuery(db, `
    CREATE TABLE IF NOT EXISTS ${TABLES.SESSIONS} (
      id TEXT PRIMARY KEY,
      startDatetime TEXT NOT NULL,
      endDatetime TEXT,
      duration INTEGER
    )
  `);

  await executeQuery(db, `
    CREATE TABLE IF NOT EXISTS ${TABLES.SESSION_EVENTS} (
      id TEXT PRIMARY KEY,
      timeBoxId TEXT NOT NULL,
      sessionId TEXT NOT NULL,
      startDatetime TEXT NOT NULL,
      endDatetime TEXT NOT NULL,
      seconds INTEGER NOT NULL,
      FOREIGN KEY (timeBoxId) REFERENCES ${TABLES.TIME_BOXES}(id),
      FOREIGN KEY (sessionId) REFERENCES ${TABLES.SESSIONS}(id)
    )
  `);

  await executeQuery(db, `
    CREATE TABLE IF NOT EXISTS ${TABLES.METADATA} (
      name TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  if (await isTableEmpty(db, TABLES.TIME_BOXES)) {
    const timeBoxes = ['Code', 'Read', 'Calls', 'Write', 'Chess', 'Exercise'];
    const colours = ['#1673FF', '#25D1DA', '#91E94B', '#6B5EFF', '#FF4040', '#F1FF53'];
    for (let i = 0; i < timeBoxes.length; i++) {
      await executeQuery(db, 'INSERT INTO timeBoxes (id, name, colour) VALUES ($1, $2, $3)', [uuidv4(), timeBoxes[i], colours[i]]);
    }
  }

  if (await isTableEmpty(db, TABLES.METADATA)) {
    await executeQuery(db, 'INSERT INTO metadata (name, value) VALUES ($1, $2)', ['app_version', '0.1']);
    await executeQuery(db, 'INSERT INTO metadata (name, value) VALUES ($1, $2)', ['sql_schema_version', '0.1']);
  }

  console.log('Database setup completed.');
}


async function getActualDbPath(): Promise<string> {
  const isDev = await checkDevMode();
  const dbName = isDev ? 'clockblocks_dev.db' : 'clockblocks.db';
  const appDataDirPath = await appDataDir();
  return `${appDataDirPath}${dbName}`;
}









// TRANSACTIONS
export async function startTransaction(): Promise<Database> {
  if (currentTransaction) {
    console.warn('A transaction is already in progress');
    return currentTransaction;
  }

  const db = await getDatabase();
  if (!db) throw new Error('Database not available');
  
  await db.execute('BEGIN TRANSACTION');
  currentTransaction = db;
  return db;
}

export async function commitTransaction(db: Database): Promise<void> {
  await db.execute('COMMIT');
  currentTransaction = null;
}

export async function rollbackTransaction(db: Database): Promise<void> {
  await db.execute('ROLLBACK');
  currentTransaction = null;
}












// SESSIONS

export async function getSessions(): Promise<Session[]> {
  const db = await getDatabase();
  if (!db) return [];
  
  const sessions = await db.select<Session[]>('SELECT * FROM sessions');
  return sessions;
}

export async function upsertSession(session: Session, db?: Database): Promise<void> {
  const connection = db || await getDatabase();
  if (!connection) throw new Error('Database not available');

  try {
    await connection.execute(`
      INSERT INTO sessions (id, startDatetime, endDatetime, duration)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        startDatetime = EXCLUDED.startDatetime,
        endDatetime = EXCLUDED.endDatetime,
        duration = EXCLUDED.duration
    `, [session.id, session.startDatetime, session.endDatetime, session.duration]);
  } catch (error) {
    console.error('Error upserting Session:', error);
    throw error;
  }
}




async function updateSessionDuration(sessionId: string,  db?: Database): Promise<void> {
  async function calculateSessionDuration(sessionId: string, db?: Database): Promise<number> {
    const connection = db || await getDatabase();
    if (!connection) throw new Error('Database not available');
  
    const events = await connection.select<SessionEvent[]>(`
      SELECT startDatetime, endDatetime FROM sessionEvents WHERE sessionId = $1
    `, [sessionId]);
  
    let totalDuration = 0;
  
    events.forEach(event => {
      const start = new Date(event.startDatetime).getTime();
      const end = event.endDatetime ? new Date(event.endDatetime).getTime() : new Date().getTime();
      if (!event.endDatetime) {
          console.log('End datetime not available, using current date instead.');
      }
      if (!isNaN(start) && !isNaN(end)) {
        totalDuration += (end - start) / 1000; // Convert milliseconds to seconds
      }
    });
  
    return totalDuration;
  }

  
  const duration = await calculateSessionDuration(sessionId, db);
  const connection = db || await getDatabase();
  if (!connection) throw new Error('Database not available');

  try {
    await connection.execute('UPDATE sessions SET duration = $1 WHERE id = $2', [duration, sessionId]);
  } catch (error) {
    console.error('Error updating session duration:', error);
    throw error;
  }
}







// SESSION EVENTS

export async function getSessionEvents(): Promise<SessionEvent[]> {
  const db = await getDatabase();
  if (!db) return [];
  
  const sessionEvents = await db.select<SessionEvent[]>('SELECT * FROM sessionEvents');
  return sessionEvents;
}


export async function upsertSessionEvent(event: SessionEvent, transaction?: Database): Promise<void> {
  const db = transaction || currentTransaction || await getDatabase();
  if (!db) throw new Error('Database not available');

  try {
    const eventId = event.id && event.id.trim() !== '' ? event.id : uuidv4();

    await db.execute(`
      INSERT INTO sessionEvents (id, timeBoxId, sessionId, startDatetime, endDatetime, seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        timeBoxId = EXCLUDED.timeBoxId,
        startDatetime = EXCLUDED.startDatetime,
        endDatetime = EXCLUDED.endDatetime,
        seconds = EXCLUDED.seconds
    `, [eventId, event.timeBoxId, event.sessionId, event.startDatetime, event.endDatetime, event.seconds]);

    // Update session duration
    await updateSessionDuration(event.sessionId, db);
  } catch (error) {
    console.error('Error upserting SessionEvent:', error);
    throw error;
  }
}




export async function deleteSessionEvent(id: string, transaction?: Database): Promise<void> {
  const db = transaction || currentTransaction || await getDatabase();
  if (!db) throw new Error('Database not available');

  try {
    const event = await db.select<SessionEvent>('SELECT sessionId FROM sessionEvents WHERE id = $1', [id]);
    const sessionId = event.sessionId;

    await db.execute('DELETE FROM sessionEvents WHERE id = $1', [id]);

    // Update session duration
    await updateSessionDuration(sessionId, db);
  } catch (error) {
    console.error('Error deleting SessionEvent:', error);
    throw error;
  }
}







// TIME BOXES

export async function getTimeBoxes(): Promise<TimeBox[]> {
  const db = await getDatabase();
  if (!db) return [];
  
  const timeBoxes = await db.select<{ id: string, name: string, isHidden: number, isDeleted: number }[]>('SELECT * FROM timeBoxes WHERE isDeleted = 0');
  return timeBoxes.map((tb) => ({
    ...tb,
    seconds: 0,
    isActive: false,
    isHidden: tb.isHidden === 1,
    isDeleted: tb.isDeleted === 1
  } as TimeBox));
}


export async function addTimeBox(name: string): Promise<string> {
  const db = await getDatabase();
  if (!db) throw new Error('Database not available');
  const id = uuidv4();

  try {
    await db.execute(
      'INSERT INTO timeBoxes (id, name, isHidden, isDeleted) VALUES ($1, $2, $3, $4)',
      [id, name, 0, 0]
    );
    return id;
  } catch (error) {
    console.error('Error adding TimeBox:', error);
    throw error;
  }
}


export async function toggleVisibilityTimeBox(id: string, setTo: boolean): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.execute('UPDATE timeBoxes SET isHidden = $1 WHERE id = $2', [setTo ? 1 : 0, id]);
  } catch (error) {
    console.error('Error toggling TimeBox visibility:', error);
    throw error;
  }
}


export async function renameTimeBox(id: string, newName: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.execute('UPDATE timeBoxes SET name = $1 WHERE id = $2', [newName, id]);
  } catch (error) {
    console.error('Error renaming TimeBox:', error);
    throw error;
  }
}



export async function changeTimeBoxColor(id: string, color: string): Promise<void> {
  const db = await getDatabase();
  if (!db) throw new Error('Database not available');

  try {
    await db.execute('UPDATE timeBoxes SET colour = $1 WHERE id = $2', [color, id]);
  } catch (error) {
    console.error('Error changing TimeBox color:', error);
    throw error;
  }
}


export async function deleteTimeBox(id: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.execute('UPDATE timeBoxes SET isDeleted = $1 WHERE id = $2', [1, id]);
  } catch (error) {
    console.error('Error marking TimeBox as deleted:', error);
    throw error;
  }
}










// METADATA

export async function getMetadata(name: string): Promise<string | null> {
  const db = await getDatabase();
  if (!db) return null;

  try {
    const result = await db.select<[{ value: string }]>('SELECT value FROM metadata WHERE name = $1', [name]);
    return result.length > 0 ? result[0].value : null;
  } catch (error) {
    console.error('Error getting metadata:', error);
    throw error;
  }
}




