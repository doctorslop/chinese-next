/**
 * Import example sentences from the Chinese Example Sentences dataset.
 * Source: https://github.com/krmanik/Chinese-Example-Sentences
 * Usage: npx tsx scripts/import-examples.ts
 */

import fs from 'fs';
import path from 'path';
import { initDatabase, importExampleSentences } from '../lib/db';

const DATA_PATH = path.join(process.cwd(), 'data', 'example_sentences.tsv');

function main() {
  console.log('Initializing database...');
  initDatabase();

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Error: Example sentences file not found at ${DATA_PATH}`);
    console.error('Download it from: https://github.com/krmanik/Chinese-Example-Sentences');
    process.exit(1);
  }

  console.log(`Reading ${DATA_PATH}...`);
  const content = fs.readFileSync(DATA_PATH, 'utf-8');
  const lines = content.split('\n');

  const rows: Array<{ id: number; simplified: string; traditional: string; pinyin: string; english: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('\t');
    if (parts.length < 5) continue;
    const id = parseInt(parts[0], 10);
    if (isNaN(id)) continue;
    rows.push({
      id,
      simplified: parts[1],
      traditional: parts[2],
      pinyin: parts[3],
      english: parts[4],
    });
  }

  console.log(`Parsed ${rows.length} example sentences, importing...`);
  const count = importExampleSentences(rows);
  console.log(`Done! ${count} example sentences imported.`);
}

main();
