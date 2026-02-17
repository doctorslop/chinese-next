/**
 * Import CC-CEDICT data into the SQLite database.
 * Optionally loads word frequency data from OpenSubtitles frequency list.
 * Usage: npm run import
 */

import fs from 'fs';
import path from 'path';
import { initDatabase, importEntries } from '../lib/db';
import { parseCedictLine } from '../lib/parser';

const DATA_PATH = path.join(process.cwd(), 'data', 'cedict_ts.u8');
const FREQ_PATH = path.join(process.cwd(), 'data', 'zh_cn_freq.txt');

function loadFrequencyMap(): Map<string, number> {
  const freqMap = new Map<string, number>();

  if (!fs.existsSync(FREQ_PATH)) {
    console.log('No frequency data found at data/zh_cn_freq.txt — skipping frequency import.');
    return freqMap;
  }

  console.log('Loading word frequency data...');
  const content = fs.readFileSync(FREQ_PATH, 'utf-8');
  const lines = content.split('\n');
  let skipped = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const spaceIdx = trimmed.lastIndexOf(' ');
    if (spaceIdx === -1) { skipped++; continue; }
    const word = trimmed.slice(0, spaceIdx);
    const count = parseInt(trimmed.slice(spaceIdx + 1), 10);
    if (word && !isNaN(count)) {
      freqMap.set(word, count);
    } else {
      skipped++;
    }
  }

  console.log(`Loaded frequency data for ${freqMap.size} words.`);
  if (skipped > 0) {
    console.warn(`Warning: ${skipped} malformed lines skipped in frequency file.`);
  }
  return freqMap;
}

function main() {
  console.log('Initializing database...');
  initDatabase();

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Error: Data file not found at ${DATA_PATH}`);
    console.error('Please download cedict_ts.u8 and place it in the data/ directory.');
    process.exit(1);
  }

  const frequencyMap = loadFrequencyMap();

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
  const count = importEntries(entries, 10000, frequencyMap);

  if (frequencyMap.size > 0) {
    const withFreq = entries.filter(e => frequencyMap.has(e.simplified) || frequencyMap.has(e.traditional)).length;
    console.log(`Frequency data matched ${withFreq} of ${count} entries (${Math.round(100 * withFreq / count)}%).`);
  }

  console.log(`Done! ${count} entries in database.`);
}

main();
