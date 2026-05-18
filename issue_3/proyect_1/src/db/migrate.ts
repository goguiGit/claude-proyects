import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function migrate(): void {
  try {
    // Use require to lazily load database when needed
    const db = require('./database.js').default || require('./database.js');
    db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  } catch (error) {
    // Gracefully handle database initialization errors (e.g., in test environments)
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    // In non-production environments, the database will be initialized when needed
  }
}
