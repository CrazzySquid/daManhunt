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

db.exec(`
  CREATE TABLE IF NOT EXISTS objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    visited INTEGER DEFAULT 0
  )
`);

function tryAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  } catch (e) {
    // column already exists, ignore
  }
}
tryAddColumn('runner_locations', 'game_id TEXT');
tryAddColumn('reveals', 'game_id TEXT');
tryAddColumn('objectives', 'game_id TEXT');

module.exports = db;