import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'snap.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export default db;
