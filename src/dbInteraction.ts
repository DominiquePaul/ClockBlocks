import Database from "tauri-plugin-sql-api";
import { invoke } from '@tauri-apps/api/tauri';
import { appDataDir } from '@tauri-apps/api/path';

import { v4 as uuidv4 } from 'uuid';
import { TimeBox, SessionEvent, Session } from './types';

let cachedDevMode: boolean | null = null;

async function checkDevMode(): Promise<boolean> {
  if (cachedDevMode === null) {
    cachedDevMode = await invoke('is_dev');
  }
  return cachedDevMode ?? false;
}

async function getDatabase(): Promise<Database> {
  const isDev = await checkDevMode();
  const dbName = isDev ? 'clockblocks_dev.db' : 'clockblocks.db';
  const dbPath = `sqlite:${dbName}`;

  let db: Database | null = null;
  try {
    db = await Database.load(dbPath);
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
  return db;
}

// Utility function to check dev mode elsewhere in your app
export async function isDevMode(): Promise<boolean> {
  return await checkDevMode();
}

// Function to initialize the database (create tables, etc.)
export async function maybeInitializeDatabase() {
  const db = await getDatabase();
  if (!db) {
    console.log('Database connection not established');
    return;
  }

  // Log the full file system path
  const fullDbPath = await getActualDbPath();
  console.log('Full database file system path:', fullDbPath);

  // Drop existing tables if they exist
  // await db.execute(`
  //     DROP TABLE IF EXISTS sessionEvents;
  //     DROP TABLE IF EXISTS metadata;
  //     DROP TABLE IF EXISTS sessions;
  //     DROP TABLE IF EXISTS timeBoxes;
  //   `);
  

  // Check if any tables exist
  const tablesExist = await db.select<[{ count: number }]>(`
    SELECT COUNT(*) as count 
    FROM sqlite_master 
    WHERE type='table' AND name IN ('timeBoxes', 'sessionEvents', 'metadata', 'sessions')
  `);

  if (tablesExist[0].count > 0) {
    console.log('Existing tables found');
  } else {
    console.log('No existing tables found');

    // Function to check if a table is empty
    async function isTableEmpty(tableName: string): Promise<boolean> {
      const result = await db.select<[{ count: number }]>(`SELECT COUNT(*) as count FROM ${tableName}`);
      return result[0].count === 0;
    }

    // Create timeBoxes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS timeBoxes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isHidden BOOLEAN DEFAULT FALSE,
        isDeleted BOOLEAN DEFAULT FALSE
      )
    `);
    const timeBoxesEmpty = await isTableEmpty('timeBoxes');

    // Create sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        startDatetime TEXT NOT NULL,
        endDatetime TEXT,
        duration INTEGER
      )
    `);
    const sessionsEmpty = await isTableEmpty('sessions');

    // Create sessionEvents table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessionEvents (
        id TEXT PRIMARY KEY,
        timeBoxId TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        startDatetime TEXT NOT NULL,
        endDatetime TEXT NOT NULL,
        seconds INTEGER NOT NULL,
        FOREIGN KEY (timeBoxId) REFERENCES timeBoxes(id),
        FOREIGN KEY (sessionId) REFERENCES sessions(id)
      )
    `);
    const sessionEventsEmpty = await isTableEmpty('sessionEvents');

    // Create metadata table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS metadata (
        name TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    const metadataEmpty = await isTableEmpty('metadata');
    if (timeBoxesEmpty) {
      // Insert initial timeBoxes data only if the table is empty
      const timeBoxes = ['Code', 'Read', 'Calls', 'Write', 'Chess', 'Exercise'];
      for (const name of timeBoxes) {
        await db.execute(
          'INSERT INTO timeBoxes (id, name) VALUES ($1, $2)',
          [uuidv4(), name]
        );
      }
    }

    if (metadataEmpty) {
      // Insert metadata only if the table is empty
      await db.execute(
        'INSERT INTO metadata (name, value) VALUES ($1, $2)',
        ['app_version', '0.1']
      );
      await db.execute(
        'INSERT INTO metadata (name, value) VALUES ($1, $2)',
        ['sql_schema_version', '0.1']
      );
    }

    console.log('Database setup completed. Tables are empty:', {
      timeBoxes: timeBoxesEmpty,
      sessions: sessionsEmpty,
      sessionEvents: sessionEventsEmpty,
      metadata: metadataEmpty
    });
  }
}

// Example functions for interacting with the database
export async function addSessionEvent(sessionEvent: Omit<SessionEvent, 'id'>): Promise<void> {
  const db = await getDatabase();
  try {
    await db.execute(
      'INSERT INTO sessionEvents (id, timeBoxId, sessionId, startDatetime, endDatetime, seconds) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), sessionEvent.timeBoxId, sessionEvent.sessionId, sessionEvent.startDatetime, sessionEvent.endDatetime, sessionEvent.seconds]
    );
  } finally {
    await db.close();
  }
}

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

export async function getSessionEvents(): Promise<SessionEvent[]> {
  const db = await getDatabase();
  if (!db) return [];
  
  return await db.select<SessionEvent[]>('SELECT * FROM sessionEvents');
}

export async function getSessions(): Promise<Session[]> {
  const db = await getDatabase();
  if (!db) return [];
  
  return await db.select<Session[]>('SELECT * FROM sessions');
}

export async function addSession(session: Session): Promise<string> {
  const db = await getDatabase();
  if (!db) throw new Error('Database not available');

  try {
    await db.execute(
      'INSERT INTO sessions (id, startDatetime, endDatetime, duration) VALUES ($1, $2, $3, $4)',
      [session.id, session.startDatetime, session.endDatetime, session.duration]
    );
    return session.id;
  } catch (error) {
    console.error('Error adding Session:', error);
    throw error;
  }
}

export async function upsertSession(session: Session): Promise<void> {
  const db = await getDatabase();
  if (!db) throw new Error('Database not available');

  try {
    await db.execute(`
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

async function getActualDbPath(): Promise<string> {
  const isDev = await checkDevMode();
  const dbName = isDev ? 'clockblocks_dev.db' : 'clockblocks.db';
  const appDataDirPath = await appDataDir();
  return `${appDataDirPath}${dbName}`;
}