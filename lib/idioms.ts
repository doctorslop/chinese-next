/**
 * Idiom (成语/chengyu) utilities.
 *
 * Identifies idioms from CC-CEDICT (typically 4-character entries tagged with
 * "idiom", "proverb", or "saying" in the definition) and provides
 * character-by-character breakdowns.
 */

import { getDatabase, ensureInitialized, type DictEntry } from './db';
import { extractPinyinSyllables } from './pinyin';

export interface IdiomEntry {
  id: number;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyin_display: string;
  syllables: [string, string][];
  definition: string;
  frequency: number;
}

export interface CharBreakdown {
  character: string;
  pinyin: string;
  definition: string;
}

export interface IdiomWithBreakdown {
  idiom: IdiomEntry;
  breakdown: CharBreakdown[];
}

/**
 * Search for idioms matching a query.
 * If query is empty, returns popular idioms sorted by frequency.
 */
export function searchIdioms(query: string, limit: number = 50, offset: number = 0): { results: IdiomEntry[]; total: number } {
  ensureInitialized();
  const db = getDatabase();

  let rows: DictEntry[];
  let total: number;

  if (!query || !query.trim()) {
    // Return popular idioms (4-char entries with idiom/proverb tags or high frequency 4-char entries)
    const idiomWhereClause = `LENGTH(simplified) = 4
        AND (definition LIKE '%idiom%' OR definition LIKE '%proverb%' OR definition LIKE '%saying%'
             OR frequency > 100)`;

    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM entries
      WHERE ${idiomWhereClause}
    `).get() as { count: number } | undefined;
    total = countRow?.count ?? 0;

    rows = db.prepare(`
      SELECT * FROM entries
      WHERE ${idiomWhereClause}
      ORDER BY
        CASE WHEN definition LIKE '%idiom%' THEN 0
             WHEN definition LIKE '%proverb%' THEN 0
             WHEN definition LIKE '%saying%' THEN 0
             ELSE 1 END,
        frequency DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as DictEntry[];
  } else {
    // Search idioms by query — escape LIKE metacharacters
    const escapedQuery = query.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const likePattern = `%${escapedQuery}%`;

    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM entries
      WHERE LENGTH(simplified) >= 4
        AND (simplified LIKE ? ESCAPE '\\' OR traditional LIKE ? ESCAPE '\\' OR definition LIKE ? ESCAPE '\\' OR pinyin_search LIKE ? ESCAPE '\\')
    `).get(likePattern, likePattern, likePattern, likePattern) as { count: number } | undefined;
    total = countRow?.count ?? 0;

    rows = db.prepare(`
      SELECT * FROM entries
      WHERE LENGTH(simplified) >= 4
        AND (simplified LIKE ? ESCAPE '\\' OR traditional LIKE ? ESCAPE '\\' OR definition LIKE ? ESCAPE '\\' OR pinyin_search LIKE ? ESCAPE '\\')
      ORDER BY
        CASE WHEN definition LIKE '%idiom%' THEN 0
             WHEN definition LIKE '%proverb%' THEN 0
             ELSE 1 END,
        frequency DESC, LENGTH(simplified)
      LIMIT ? OFFSET ?
    `).all(likePattern, likePattern, likePattern, likePattern, limit, offset) as DictEntry[];
  }

  return {
    results: rows.map(row => ({
      id: row.id,
      simplified: row.simplified,
      traditional: row.traditional,
      pinyin: row.pinyin,
      pinyin_display: row.pinyin_display,
      syllables: extractPinyinSyllables(row.pinyin),
      definition: row.definition,
      frequency: row.frequency,
    })),
    total,
  };
}

/**
 * Get an idiom by its simplified or traditional form, with character-by-character breakdown.
 */
export function getIdiomBreakdown(word: string): IdiomWithBreakdown | null {
  ensureInitialized();
  const db = getDatabase();

  const row = db.prepare(`
    SELECT * FROM entries
    WHERE simplified = ? OR traditional = ?
    ORDER BY frequency DESC
    LIMIT 1
  `).get(word, word) as DictEntry | undefined;

  if (!row) return null;

  const chars = [...row.simplified];
  const syllables = extractPinyinSyllables(row.pinyin);

  const charLookup = db.prepare(`
    SELECT simplified, pinyin_display, definition FROM entries
    WHERE (simplified = ? OR traditional = ?) AND LENGTH(simplified) = 1
    ORDER BY frequency DESC
    LIMIT 1
  `);

  const breakdown: CharBreakdown[] = chars.map((char, i) => {
    const charEntry = charLookup.get(char, char) as Pick<DictEntry, 'simplified' | 'pinyin_display' | 'definition'> | undefined;
    return {
      character: char,
      pinyin: syllables[i] ? syllables[i][1] : (charEntry?.pinyin_display ?? ''),
      definition: charEntry?.definition ?? '(not found)',
    };
  });

  return {
    idiom: {
      id: row.id,
      simplified: row.simplified,
      traditional: row.traditional,
      pinyin: row.pinyin,
      pinyin_display: row.pinyin_display,
      syllables: extractPinyinSyllables(row.pinyin),
      definition: row.definition,
      frequency: row.frequency,
    },
    breakdown,
  };
}
