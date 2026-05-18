import db from './database.js';

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      user_id INTEGER
    )
  `);

  try {
    db.exec('ALTER TABLE urls ADD COLUMN user_id INTEGER');
  } catch {
    // column already exists from a previous run
  }
}
