/**
 * Pinyin conversion utilities for tone numbers <-> tone marks.
 * Handles the 'v' -> 'ü' conversion and normalization.
 *
 * Port of pinyin_utils.py - identical logic.
 */

// Tone mark mappings for each vowel (index 0=tone1, 1=tone2, 2=tone3, 3=tone4, 4=tone5/neutral)
const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

// Reverse mapping: tone mark -> [base vowel, tone number]
const TONE_MARK_TO_NUMBER: Record<string, [string, number]> = {};
for (const [vowel, marks] of Object.entries(TONE_MARKS)) {
  for (let i = 0; i < marks.length; i++) {
    TONE_MARK_TO_NUMBER[marks[i]] = [vowel, i < 4 ? i + 1 : 5];
  }
}

/**
 * Normalize user input pinyin:
 * - Convert 'v' to 'ü'
 * - Lowercase
 * - Handle both tone numbers and tone marks
 * Returns normalized pinyin for search (no tones, no marks).
 */
export function normalizePinyinInput(text: string): string {
  text = text.toLowerCase();
  text = text.replace(/v/g, 'ü');

  // Remove tone numbers
  text = text.replace(/[1-5]/g, '');

  // Remove tone marks by converting to base vowels
  for (const [mark, [vowel]] of Object.entries(TONE_MARK_TO_NUMBER)) {
    text = text.split(mark).join(vowel);
  }

  // Convert ü back to v for consistent storage/search
  text = text.replace(/ü/g, 'v');

  return text;
}

/**
 * Convert a pinyin syllable with tone number to tone marks.
 * E.g., 'ni3' -> 'nǐ', 'lv4' -> 'lǜ'
 *
 * Tone placement rules:
 * 1. If there's an 'a' or 'e', it takes the tone mark
 * 2. If there's 'ou', the 'o' takes the tone mark
 * 3. Otherwise, the second vowel takes the tone mark
 */
export function toneNumberToMark(syllable: string): string {
  syllable = syllable.toLowerCase().replace(/v/g, 'ü');

  // Extract tone number
  const match = syllable.match(/^([a-züü]+)([1-5])?$/);
  if (!match) {
    return syllable;
  }

  const base = match[1];
  const tone = match[2] ? parseInt(match[2]) : 5;

  if (tone === 5 || tone < 1) {
    return base;
  }

  // Find the vowel to mark
  const vowels = 'aeiouü';
  const vowelPositions: [number, string][] = [];
  for (let i = 0; i < base.length; i++) {
    if (vowels.includes(base[i])) {
      vowelPositions.push([i, base[i]]);
    }
  }

  if (vowelPositions.length === 0) {
    return base;
  }

  // Determine which vowel gets the tone mark
  let markPos: number | null = null;

  // Rule 1: 'a' or 'e' takes the mark
  for (const [pos, vowel] of vowelPositions) {
    if (vowel === 'a' || vowel === 'e') {
      markPos = pos;
      break;
    }
  }

  // Rule 2: 'ou' - 'o' takes the mark
  if (markPos === null && base.includes('ou')) {
    for (const [pos, vowel] of vowelPositions) {
      if (vowel === 'o') {
        markPos = pos;
        break;
      }
    }
  }

  // Rule 3: Second vowel takes the mark
  if (markPos === null) {
    if (vowelPositions.length >= 2) {
      markPos = vowelPositions[1][0];
    } else {
      markPos = vowelPositions[0][0];
    }
  }

  // Apply the tone mark
  const vowelChar = base[markPos];
  if (vowelChar in TONE_MARKS) {
    const markedVowel = TONE_MARKS[vowelChar][tone - 1];
    return base.slice(0, markPos) + markedVowel + base.slice(markPos + 1);
  }

  return base;
}

/**
 * Convert full pinyin string with tone numbers to display format.
 * E.g., 'ni3 hao3' -> 'nǐ hǎo'
 */
export function convertPinyinDisplay(pinyinWithNumbers: string): string {
  const syllables = pinyinWithNumbers.split(/\s+/);
  return syllables.map(toneNumberToMark).join(' ');
}

/**
 * Extract individual syllables from pinyin string.
 * Returns list of [syllable_with_number, syllable_display] tuples.
 * E.g., 'ni3 hao3' -> [['ni3', 'nǐ'], ['hao3', 'hǎo']]
 */
export function extractPinyinSyllables(pinyinWithNumbers: string): [string, string][] {
  const syllables = pinyinWithNumbers.split(/\s+/);
  return syllables.map((s) => [s, toneNumberToMark(s)]);
}

/**
 * Get the audio filename for a pinyin syllable.
 * E.g., 'ni3' -> 'ni3.mp3'
 */
export function getAudioFilename(syllableWithNumber: string): string {
  // Normalize: lowercase, v for ü
  let syllable = syllableWithNumber.toLowerCase().replace(/ü/g, 'v');
  // Ensure tone number
  if (!/[1-5]$/.test(syllable)) {
    syllable += '5'; // neutral tone
  }
  return `${syllable}.mp3`;
}

/**
 * Check if text looks like pinyin input.
 */
export function isPinyin(text: string): boolean {
  let t = text.toLowerCase().replace(/v/g, 'ü');
  // Remove tone numbers
  t = t.replace(/[1-5]/g, '');
  // Remove tone marks
  for (const mark of Object.keys(TONE_MARK_TO_NUMBER)) {
    t = t.split(mark).join('a');
  }
  // Check if remaining is all ASCII letters
  return /^[a-z\s]+$/.test(t) && t.length > 0;
}

/**
 * Check if text contains Chinese characters.
 */
export function isChinese(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code >= 0x4e00 && code <= 0x9fff) return true;
    if (code >= 0x3400 && code <= 0x4dbf) return true; // Extension A
    if (code >= 0x20000 && code <= 0x2a6df) return true; // Extension B
  }
  return false;
}
