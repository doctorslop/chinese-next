/**
 * CC-CEDICT format parser.
 * Format: Traditional Simplified [pinyin] /definition1/definition2/.../
 *
 * Port of parser.py - identical logic.
 */

import { convertPinyinDisplay, normalizePinyinInput } from './pinyin';

export interface CedictEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyin_display: string;
  pinyin_search: string;
  definition: string;
}

/**
 * Parse a single CC-CEDICT line.
 * Returns entry object or null if line is a comment or invalid.
 */
export function parseCedictLine(line: string): CedictEntry | null {
  line = line.trim();

  // Skip comments and empty lines
  if (!line || line.startsWith('#')) {
    return null;
  }

  // CC-CEDICT format: Traditional Simplified [pinyin] /definitions/
  // Example: 你好 你好 [ni3 hao3] /hello/hi/how are you?/
  const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/);
  if (!match) {
    return null;
  }

  const traditional = match[1];
  const simplified = match[2];
  const pinyinRaw = match[3]; // e.g., "ni3 hao3"
  const definitionsRaw = match[4]; // e.g., "hello/hi/how are you?"

  // Convert pinyin to display format (with tone marks)
  const pinyin_display = convertPinyinDisplay(pinyinRaw);

  // Normalize pinyin for search (no tones)
  const pinyin_search = normalizePinyinInput(pinyinRaw);

  // Join definitions with " / " (as per original implementation)
  const definition = definitionsRaw.replace(/\//g, ' / ');

  return {
    traditional,
    simplified,
    pinyin: pinyinRaw,
    pinyin_display,
    pinyin_search,
    definition,
  };
}

/**
 * Parse an entire CC-CEDICT file content.
 * Returns array of entries.
 */
export function parseCedictContent(content: string): CedictEntry[] {
  const entries: CedictEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const entry = parseCedictLine(line);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}
