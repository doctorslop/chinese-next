/**
 * Shared entry formatting utilities used by both the search page and API route.
 */

import { extractPinyinSyllables } from './pinyin';
import type { FormattedEntry } from '@/components/EntryList';

export function formatEntry(entry: {
  id: number;
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyin_display: string;
  definition: string;
  frequency: number;
}): FormattedEntry {
  return {
    id: entry.id,
    headword: entry.simplified,
    traditional: entry.traditional,
    simplified: entry.simplified,
    pinyin: entry.pinyin,
    pinyin_display: entry.pinyin_display,
    syllables: extractPinyinSyllables(entry.pinyin),
    definition: entry.definition,
    frequency: entry.frequency,
  };
}
