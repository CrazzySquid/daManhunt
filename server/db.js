const Database = require('better-sqlite3');
const db = new Database('manhunt.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS runner_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    runner_id TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    accuracy REAL,
    timestamp INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reveals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    runner_id TEXT NOT NULL,
    revealed_at INTEGER NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    accuracy REAL
  )
`);

module.exports = db;