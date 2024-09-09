import Database from "tauri-plugin-sql-api";

import { v4 as uuidv4 } from 'uuid';
import { TimeBox, SessionEvent } from './types';

const DB_NAME = 'clockblocks.db';
const DB_PATH = `sqlite:${DB_NAME}`;

// Improved isTauri check
function isTauri() {
  return Boolean(window && window.__TAURI__);
}

async function createOrLoadDatabase() {
  if (!isTauri()) {
    console.log('Not running in Tauri environment, skipping database creation');
    return;
  }

  try {
    let db = await Database.load(DB_PATH);
    await initializeDatabase(db);
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Function to initialize the database (create tables, etc.)
async function initializeDatabase(db: Database) {
  // Create timeBoxes table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS timeBoxes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isDeleted BOOLEAN DEFAULT FALSE
    )
  `);

  // Create sessionEvents table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessionEvents (
      id TEXT PRIMARY KEY,
      timeBoxId TEXT NOT NULL,
      startDatetime TEXT NOT NULL,
      endDatetime TEXT NOT NULL,
      seconds INTEGER NOT NULL,
      FOREIGN KEY (timeBoxId) REFERENCES timeBoxes(id)
    )
  `);

  // Create metadata table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS metadata (
      name TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  
  // Check if timeBoxes table is empty
  const timeBoxCount = await db.select<[{ count: number }]>('SELECT COUNT(*) as count FROM timeBoxes');
  if (timeBoxCount[0].count === 0) {
    // Insert initial timeBoxes data only if the table is empty
    const timeBoxes = ['Code', 'Read', 'Calls', 'Write', 'Chess', 'Exercise'];
    for (const name of timeBoxes) {
      await db.execute(
        'INSERT INTO timeBoxes (id, name) VALUES ($1, $2)',
        [uuidv4(), name]
      );
    }
  }

  // Check if metadata table is empty
  const metadataCount = await db.select<[{ count: number }]>('SELECT COUNT(*) as count FROM metadata');
  if (metadataCount[0].count === 0) {
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

  console.log('Database setup completed successfully.');
}

// Run the setup
createOrLoadDatabase();

// Example functions for interacting with the database
export async function addSessionEvent(sessionEvent: Omit<SessionEvent, 'id'>): Promise<void> {
  if (!isTauri()) {
    console.log('Not in Tauri environment, skipping database operation');
    return;
  }
  const db = await Database.load(DB_PATH);
  await db.execute(
    'INSERT INTO sessionEvents (id, timeBoxId, startDatetime, endDatetime, seconds) VALUES ($1, $2, $3, $4, $5)',
    [uuidv4(), sessionEvent.timeBoxId, sessionEvent.startDatetime, sessionEvent.endDatetime, sessionEvent.seconds]
  );
}

export async function getTimeBoxes(): Promise<TimeBox[]> {
  if (!isTauri()) {
    console.log('Not in Tauri environment, returning empty array');
    return [];
  }
  const db = await Database.load(DB_PATH);
  const timeBoxes = await db.select<(Omit<TimeBox, 'seconds' | 'isActive'> & { id: string, name: string, isDeleted: boolean })[]>('SELECT * FROM timeBoxes WHERE isDeleted = FALSE');
  return timeBoxes.map(tb => ({
    ...tb,
    isDeleted: Boolean(tb.isDeleted),
    seconds: 0,
    isActive: false
  }));
}

export async function getSessionEvents(): Promise<SessionEvent[]> {
  if (!isTauri()) {
    console.log('Not in Tauri environment, returning empty array');
    return [];
  }
  const db = await Database.load(DB_PATH);
  return await db.select<SessionEvent[]>('SELECT * FROM sessionEvents');
}

export async function updateMetadata(name: string, value: string): Promise<void> {
  if (!isTauri()) {
    console.log('Not in Tauri environment, skipping database operation');
    return;
  }
  const db = await Database.load(DB_PATH);
  await db.execute(
    'INSERT OR REPLACE INTO metadata (name, value) VALUES ($1, $2)',
    [name, value]
  );
}