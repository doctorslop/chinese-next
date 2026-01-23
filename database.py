"""
Database operations for the dictionary.
Uses SQLite with FTS5 for full-text search.
"""

import sqlite3
import os
from parser import parse_cedict_file


DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'dictionary.db')


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    # Main entries table
    cursor.execute('''
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
    ''')

    # Create indexes for faster lookups
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_traditional ON entries(traditional)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_simplified ON entries(simplified)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_pinyin_search ON entries(pinyin_search)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_pinyin_nospace ON entries(pinyin_nospace)')

    # Migrate existing databases: add pinyin_nospace column if missing
    try:
        cursor.execute("SELECT pinyin_nospace FROM entries LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE entries ADD COLUMN pinyin_nospace TEXT NOT NULL DEFAULT ''")

    # Populate pinyin_nospace for any rows that haven't been filled yet
    cursor.execute("UPDATE entries SET pinyin_nospace = REPLACE(pinyin_search, ' ', '') WHERE pinyin_nospace = ''")

    # FTS5 virtual table for full-text search
    cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
            traditional,
            simplified,
            pinyin_search,
            definition,
            content='entries',
            content_rowid='id'
        )
    ''')

    # Triggers to keep FTS in sync
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
            INSERT INTO entries_fts(rowid, traditional, simplified, pinyin_search, definition)
            VALUES (new.id, new.traditional, new.simplified, new.pinyin_search, new.definition);
        END
    ''')

    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
            INSERT INTO entries_fts(entries_fts, rowid, traditional, simplified, pinyin_search, definition)
            VALUES ('delete', old.id, old.traditional, old.simplified, old.pinyin_search, old.definition);
        END
    ''')

    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
            INSERT INTO entries_fts(entries_fts, rowid, traditional, simplified, pinyin_search, definition)
            VALUES ('delete', old.id, old.traditional, old.simplified, old.pinyin_search, old.definition);
            INSERT INTO entries_fts(rowid, traditional, simplified, pinyin_search, definition)
            VALUES (new.id, new.traditional, new.simplified, new.pinyin_search, new.definition);
        END
    ''')

    conn.commit()
    conn.close()


def import_cedict(filepath, batch_size=10000):
    """
    Import CC-CEDICT data into the database.
    """
    init_database()

    conn = get_connection()
    cursor = conn.cursor()

    # Clear existing data
    cursor.execute('DELETE FROM entries')
    cursor.execute('DELETE FROM entries_fts')

    batch = []
    count = 0

    for entry in parse_cedict_file(filepath):
        pinyin_search = entry['pinyin_search']
        batch.append((
            entry['traditional'],
            entry['simplified'],
            entry['pinyin'],
            entry['pinyin_display'],
            pinyin_search,
            pinyin_search.replace(' ', ''),
            entry['definition'],
        ))

        if len(batch) >= batch_size:
            cursor.executemany('''
                INSERT INTO entries (traditional, simplified, pinyin, pinyin_display, pinyin_search, pinyin_nospace, definition)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', batch)
            count += len(batch)
            batch = []
            print(f"Imported {count} entries...")

    # Insert remaining
    if batch:
        cursor.executemany('''
            INSERT INTO entries (traditional, simplified, pinyin, pinyin_display, pinyin_search, pinyin_nospace, definition)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', batch)
        count += len(batch)

    conn.commit()
    conn.close()

    print(f"Import complete: {count} entries total")
    return count


def get_entry_count():
    """Get the total number of entries in the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM entries')
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_entry_by_id(entry_id):
    """Get a single entry by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM entries WHERE id = ?', (entry_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def search_entries(query, limit=1000):
    """
    Basic search across all fields.
    Returns list of entry dicts.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Use FTS5 for search
    cursor.execute('''
        SELECT e.* FROM entries e
        JOIN entries_fts fts ON e.id = fts.rowid
        WHERE entries_fts MATCH ?
        LIMIT ?
    ''', (query, limit))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def search_by_chinese(text, limit=1000):
    """Search by Chinese characters (traditional or simplified)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM entries
        WHERE traditional LIKE ? OR simplified LIKE ?
        LIMIT ?
    ''', (f'%{text}%', f'%{text}%', limit))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def search_by_pinyin(text, limit=1000):
    """Search by pinyin (normalized)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM entries
        WHERE pinyin_search LIKE ?
        LIMIT ?
    ''', (f'%{text}%', limit))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def search_by_definition(text, limit=1000):
    """Search by English definition."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM entries
        WHERE definition LIKE ?
        LIMIT ?
    ''', (f'%{text}%', limit))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_suggestions(query, limit=10):
    """
    Get word suggestions for "Did you mean" feature.
    Uses simple prefix matching on definitions.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Get words from definitions that are similar
    cursor.execute('''
        SELECT DISTINCT
            SUBSTR(definition, 1, INSTR(definition || ' ', ' ') - 1) as word
        FROM entries
        WHERE definition LIKE ?
        LIMIT ?
    ''', (f'{query}%', limit))

    suggestions = [row['word'] for row in cursor.fetchall() if row['word']]
    conn.close()
    return suggestions
