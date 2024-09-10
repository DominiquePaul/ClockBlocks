import Database from "tauri-plugin-sql-api";

import { v4 as uuidv4 } from 'uuid';
import { TimeBox, SessionEvent, Session } from './types';

const DB_NAME = 'clockblocks.db';
const DB_PATH = `sqlite:${DB_NAME}`;



async function getDatabase(): Promise<Database> {
  let db: Database | null = null;
  try {
    db = await Database.load(DB_PATH);
    // console.log('All existing tables dropped successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
  return db;
}

// Function to initialize the database (create tables, etc.)
export async function maybeInitializeDatabase() {
  const db = await getDatabase();
  if (!db) {
    console.log('Database connection not established');
    return;
  }
  // Drop existing tables if they exist
  await db.execute(`
      DROP TABLE IF EXISTS sessionEvents;
      DROP TABLE IF EXISTS metadata;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS timeBoxes;
    `);
  

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
  if (!db) return;
  
  try {
    await db.execute(
      'INSERT INTO sessionEvents (id, timeBoxId, sessionId, startDatetime, endDatetime, seconds) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), sessionEvent.timeBoxId, sessionEvent.sessionId, sessionEvent.startDatetime, sessionEvent.endDatetime, sessionEvent.seconds]
    );
  } catch (error) {
    console.error('Error adding session event:', error);
    throw error;
  }
}

export async function getTimeBoxes(): Promise<TimeBox[]> {
  const db = await getDatabase();
  if (!db) return [];
  
  const timeBoxes = await db.select<(Omit<TimeBox, 'seconds' | 'isActive'> & { id: string, name: string, isDeleted: boolean })[]>('SELECT * FROM timeBoxes WHERE isDeleted = FALSE');
  return timeBoxes.map(tb => ({
    ...tb,
    isDeleted: Boolean(tb.isDeleted),
    seconds: 0,
    isActive: false
  }));
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


export async function deleteTimeBox(id: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.execute('UPDATE timeBoxes SET isDeleted = TRUE WHERE id = $1', [id]);
  } catch (error) {
    console.error('Error deleting TimeBox:', error);
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
      'INSERT INTO timeBoxes (id, name, isDeleted) VALUES ($1, $2, FALSE)',
      [id, name]
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