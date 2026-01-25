/**
 * Database operations for the dictionary.
 * Uses SQLite with FTS5 for full-text search.
 *
 * Port of database.py - identical schema, indexes, triggers, and migrations.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DATABASE_PATH = path.join(process.cwd(), 'dictionary.db');

let _db: Database.Database | null = null;

/**
 * Get a database connection (singleton per process).
 * better-sqlite3 is synchronous, matching Python's sqlite3 behavior.
 */
export function getDatabase(): Database.Database {
  if (!_db) {
    _db = new Database(DATABASE_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('synchronous = NORMAL');
  }
  return _db;
}

/**
 * Initialize the database schema.
 * Creates tables, indexes, FTS5 virtual table, and triggers.
 * Also runs migrations (pinyin_nospace column).
 */
export function initDatabase(): void {
  const db = getDatabase();

  // Main entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      traditional TEXT NOT NULL,
      simplified TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      pinyin_display TEXT NOT NULL,
      pinyin_search TEXT NOT NULL,
      pinyin_nospace TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL
    )
  `);

  // Create indexes for faster lookups
  db.exec('CREATE INDEX IF NOT EXISTS idx_traditional ON entries(traditional)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_simplified ON entries(simplified)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pinyin_search ON entries(pinyin_search)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pinyin_nospace ON entries(pinyin_nospace)');

  // Migrate existing databases: add pinyin_nospace column if missing
  try {
    db.prepare('SELECT pinyin_nospace FROM entries LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE entries ADD COLUMN pinyin_nospace TEXT NOT NULL DEFAULT ''");
  }

  // Populate pinyin_nospace for any rows that haven't been filled yet
  db.exec("UPDATE entries SET pinyin_nospace = REPLACE(pinyin_search, ' ', '') WHERE pinyin_nospace = ''");

  // FTS5 virtual table for full-text search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
      traditional,
      simplified,
      pinyin_search,
      definition,
      content='entries',
      content_rowid='id'
    )
  `);

  // Triggers to keep FTS in sync
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
      INSERT INTO entries_fts(rowid, traditional, simplified, pinyin_search, definition)
      VALUES (new.id, new.traditional, new.simplified, new.pinyin_search, new.definition);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
      INSERT INTO entries_fts(entries_fts, rowid, traditional, simplified, pinyin_search, definition)
      VALUES ('delete', old.id, old.traditional, old.simplified, old.pinyin_search, old.definition);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
      INSERT INTO entries_fts(entries_fts, rowid, traditional, simplified, pinyin_search, definition)
      VALUES ('delete', old.id, old.traditional, old.simplified, old.pinyin_search, old.definition);
      INSERT INTO entries_fts(rowid, traditional, simplified, pinyin_search, definition)
      VALUES (new.id, new.traditional, new.simplified, new.pinyin_search, new.definition);
    END
  `);
}

export interface DictEntry {
  id: number;
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyin_display: string;
  pinyin_search: string;
  pinyin_nospace: string;
  definition: string;
}

/**
 * Get the total number of entries in the database.
 */
export function getEntryCount(): number {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) as count FROM entries').get() as { count: number } | undefined;
  return row?.count ?? 0;
}

/**
 * Import CC-CEDICT data into the database.
 */
export function importEntries(
  entries: Array<{
    traditional: string;
    simplified: string;
    pinyin: string;
    pinyin_display: string;
    pinyin_search: string;
    definition: string;
  }>,
  batchSize: number = 10000
): number {
  const db = getDatabase();

  // Clear existing data
  db.exec('DELETE FROM entries');
  db.exec('DELETE FROM entries_fts');

  const insert = db.prepare(`
    INSERT INTO entries (traditional, simplified, pinyin, pinyin_display, pinyin_search, pinyin_nospace, definition)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;

  const insertBatch = db.transaction((batch: typeof entries) => {
    for (const entry of batch) {
      const pinyinNospace = entry.pinyin_search.replace(/ /g, '');
      insert.run(
        entry.traditional,
        entry.simplified,
        entry.pinyin,
        entry.pinyin_display,
        entry.pinyin_search,
        pinyinNospace,
        entry.definition
      );
    }
  });

  // Process in batches
  let batch: typeof entries = [];
  for (const entry of entries) {
    batch.push(entry);
    if (batch.length >= batchSize) {
      insertBatch(batch);
      count += batch.length;
      console.log(`Imported ${count} entries...`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    insertBatch(batch);
    count += batch.length;
  }

  console.log(`Import complete: ${count} entries total`);
  return count;
}

// Ensure database is initialized on first use
let _initialized = false;
export function ensureInitialized(): void {
  if (!_initialized) {
    initDatabase();
    _initialized = true;
  }
}
