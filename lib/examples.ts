/**
 * Example sentences and compound words for dictionary entries.
 *
 * Uses the example_sentences table (63k+ sentences from Tatoeba) for real examples,
 * and finds compound words from the dictionary.
 */

import { getDatabase, ensureInitialized, type DictEntry } from './db';
import { isChinese } from './pinyin';

export interface ExampleUsage {
  word: string;
  pinyin: string;
  definition: string;
}

export interface ExampleSentence {
  chinese: string;
  pinyin: string;
  english: string;
}

/**
 * Find compound words/phrases that contain the given Chinese word.
 */
export function findCompoundWords(word: string, limit: number = 8): ExampleUsage[] {
  if (!word || !isChinese(word)) return [];

  ensureInitialized();
  const db = getDatabase();

  const escapedWord = word.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const rows = db.prepare(`
    SELECT simplified, pinyin_display, definition
    FROM entries
    WHERE (simplified LIKE ? ESCAPE '\\' OR traditional LIKE ? ESCAPE '\\')
      AND simplified != ? AND traditional != ?
    ORDER BY frequency DESC, LENGTH(simplified)
    LIMIT ?
  `).all(`%${escapedWord}%`, `%${escapedWord}%`, word, word, limit) as Pick<DictEntry, 'simplified' | 'pinyin_display' | 'definition'>[];

  return rows.map(row => ({
    word: row.simplified,
    pinyin: row.pinyin_display,
    definition: row.definition,
  }));
}

/**
 * Get example sentences for a word from the database.
 * Searches for sentences containing the word in simplified Chinese.
 */
export function getExampleSentences(word: string, limit: number = 5): ExampleSentence[] {
  if (!word || !isChinese(word)) return [];

  ensureInitialized();
  const db = getDatabase();

  try {
    const escapedWord = word.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const rows = db.prepare(`
      SELECT simplified, pinyin, english
      FROM example_sentences
      WHERE simplified LIKE ? ESCAPE '\\'
      ORDER BY LENGTH(simplified) ASC
      LIMIT ?
    `).all(`%${escapedWord}%`, limit) as { simplified: string; pinyin: string; english: string }[];

    return rows.map(row => ({
      chinese: row.simplified,
      pinyin: row.pinyin,
      english: row.english,
    }));
  } catch {
    return [];
  }
}
