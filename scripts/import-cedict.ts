/**
 * Import CC-CEDICT data into the SQLite database.
 * Usage: npm run import
 *
 * Port of scripts/import_cedict.py - identical behavior.
 */

import fs from 'fs';
import path from 'path';
import { initDatabase, importEntries } from '../lib/db';
import { parseCedictLine } from '../lib/parser';

const DATA_PATH = path.join(process.cwd(), 'data', 'cedict_ts.u8');

function main() {
  console.log('Initializing database...');
  initDatabase();

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Error: Data file not found at ${DATA_PATH}`);
    console.error('Please download cedict_ts.u8 and place it in the data/ directory.');
    process.exit(1);
  }

  console.log(`Reading ${DATA_PATH}...`);
  const content = fs.readFileSync(DATA_PATH, 'utf-8');
  const lines = content.split('\n');

  console.log('Parsing entries...');
  const entries: Array<{
    traditional: string;
    simplified: string;
    pinyin: string;
    pinyin_display: string;
    pinyin_search: string;
    definition: string;
  }> = [];

  for (const line of lines) {
    const entry = parseCedictLine(line);
    if (entry) {
      entries.push(entry);
    }
  }

  console.log(`Parsed ${entries.length} entries, importing...`);
  const count = importEntries(entries);
  console.log(`Done! ${count} entries in database.`);
}

main();
