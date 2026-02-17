/**
 * Advanced search engine implementing all query operators:
 * - Wildcard (*) searches
 * - Exclusion (-) operator
 * - Field prefixes (c:, p:, e:)
 * - Quoted phrase matching
 * - Chinese text segmentation (character breakdown)
 *
 * Port of search.py - identical SQL generation and ordering.
 */

import { getDatabase, ensureInitialized, type DictEntry } from './db';
import { normalizePinyinInput, isChinese, isPinyin } from './pinyin';
import { MAX_TOKENS } from './constants';

/**
 * Merge consecutive unfielded pinyin tokens into a single token.
 * Without this, "ni3 hao3" becomes two AND conditions that can never
 * both match pinyin_nospace (a string can't start with both "ni" and "hao").
 */
function mergePinyinTokens(tokens: SearchToken[]): SearchToken[] {
  const result: SearchToken[] = [];
  let pinyinBuffer: SearchToken[] = [];

  function flush() {
    if (pinyinBuffer.length > 1) {
      result.push({
        term: pinyinBuffer.map((t) => t.term).join(' '),
        field: null,
        exclude: false,
        wildcard: false,
        phrase: false,
      });
    } else if (pinyinBuffer.length === 1) {
      result.push(pinyinBuffer[0]);
    }
    pinyinBuffer = [];
  }

  for (const token of tokens) {
    if (
      !token.exclude &&
      !token.field &&
      !token.wildcard &&
      !token.phrase &&
      isPinyin(token.term)
    ) {
      pinyinBuffer.push(token);
    } else {
      flush();
      result.push(token);
    }
  }
  flush();

  return result;
}

interface SearchToken {
  term: string;
  field: 'chinese' | 'pinyin' | 'english' | null;
  exclude: boolean;
  wildcard: boolean;
  phrase: boolean;
}

export interface SearchDebugInfo {
  sql: string;
  params: (string | number)[];
  parseTime: number;
  queryTime: number;
  totalTime: number;
  tokenCount: number;
  tokens: SearchToken[];
}

/**
 * Parse query into structured tokens.
 * Returns list of tokens with: term, field, exclude, wildcard, phrase
 */
function parseQuery(query: string): SearchToken[] {
  const tokens: SearchToken[] = [];
  query = query.trim();

  // Regex to match tokens:
  // - Quoted phrases: "..."
  // - Field prefixes: c:, p:, e:
  // - Exclusion: -
  // - Regular terms
  const pattern = /(-)?(?:(c:|p:|e:))?(?:"([^"]+)"|(\S+))/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(query)) !== null && tokens.length < MAX_TOKENS) {
    const exclude = Boolean(match[1]);
    const fieldPrefix = match[2] || null;
    const phrase = match[3] || null;
    const term = match[4] || null;

    let actualTerm: string;
    let isPhrase: boolean;

    if (phrase) {
      actualTerm = phrase;
      isPhrase = true;
    } else if (term) {
      actualTerm = term;
      isPhrase = false;
    } else {
      continue;
    }

    // Determine field
    let field: SearchToken['field'] = null;
    if (fieldPrefix) {
      if (fieldPrefix === 'c:') field = 'chinese';
      else if (fieldPrefix === 'p:') field = 'pinyin';
      else if (fieldPrefix === 'e:') field = 'english';
    }

    // Check for wildcard
    const hasWildcard = actualTerm.includes('*');

    tokens.push({
      term: actualTerm,
      field,
      exclude,
      wildcard: hasWildcard,
      phrase: isPhrase,
    });
  }

  return tokens;
}

/**
 * Convert wildcard pattern to SQL LIKE pattern.
 */
function buildWildcardPattern(term: string): string {
  // Escape SQL special characters first
  term = term.replace(/%/g, '\\%').replace(/_/g, '\\_');
  // Then convert * to %
  return term.replace(/\*/g, '%');
}

/**
 * Build SQL condition for a token.
 * Returns [condition_sql, params] tuple.
 */
function buildCondition(token: SearchToken): [string, (string | number)[]] {
  let term = token.term;
  const field = token.field;
  const exclude = token.exclude;
  const wildcard = token.wildcard;
  const phrase = token.phrase;

  const params: (string | number)[] = [];

  // Determine which fields to search
  let fields: string[];
  if (field === 'chinese') {
    fields = ['traditional', 'simplified'];
  } else if (field === 'pinyin') {
    fields = ['pinyin_search'];
    // Normalize pinyin term for search
    term = normalizePinyinInput(term);
  } else if (field === 'english') {
    fields = ['definition'];
  } else {
    // Auto-detect based on content
    if (isChinese(term.replace(/\*/g, ''))) {
      fields = ['traditional', 'simplified'];
    } else if (isPinyin(term.replace(/\*/g, ''))) {
      fields = ['pinyin_search', 'traditional', 'simplified', 'definition'];
    } else {
      fields = ['definition', 'traditional', 'simplified', 'pinyin_search'];
    }
  }

  // Build the condition
  let condition: string;

  if (wildcard) {
    const pattern = buildWildcardPattern(term);
    const fieldConditions: string[] = [];

    for (const f of fields) {
      if (f === 'pinyin_search') {
        // Normalize the search pattern for pinyin (remove tones and spaces)
        // Use \x00 as placeholder since it won't appear in pinyin
        const normalizedPattern = buildWildcardPattern(
          normalizePinyinInput(term.replace(/\*/g, '\x00'))
            .replace(/ /g, '')
            .replace(/\x00/g, '*')
        );
        // Use pre-computed pinyin_nospace column (indexed)
        fieldConditions.push("pinyin_nospace LIKE ? ESCAPE '\\'");
        params.push(normalizedPattern);
      } else {
        fieldConditions.push(`${f} LIKE ? ESCAPE '\\'`);
        params.push(pattern);
      }
    }

    condition = `(${fieldConditions.join(' OR ')})`;
  } else if (phrase) {
    // Exact phrase match - use LIKE with the phrase
    const fieldConditions: string[] = [];
    for (const f of fields) {
      fieldConditions.push(`${f} LIKE ? ESCAPE '\\'`);
      params.push(`%${term}%`);
    }
    condition = `(${fieldConditions.join(' OR ')})`;
  } else {
    // Regular term match
    const fieldConditions: string[] = [];
    for (const f of fields) {
      if (f === 'pinyin_search') {
        // Normalize pinyin for comparison (remove tones and spaces)
        const normalized = normalizePinyinInput(term).replace(/ /g, '');
        // Use starts-with matching to avoid cross-syllable substring matches
        fieldConditions.push("pinyin_nospace LIKE ? ESCAPE '\\'");
        params.push(`${normalized}%`);
      } else {
        fieldConditions.push(`${f} LIKE ? ESCAPE '\\'`);
        params.push(`%${term}%`);
      }
    }
    condition = `(${fieldConditions.join(' OR ')})`;
  }

  if (exclude) {
    condition = `NOT ${condition}`;
  }

  return [condition, params];
}

/**
 * Execute a search query.
 * Returns list of entry objects.
 * Optionally returns debug info via the debug parameter.
 */
export function search(
  query: string,
  limit: number = 500,
  offset: number = 0,
  debug: boolean = false
): { results: DictEntry[]; debugInfo?: SearchDebugInfo } {
  const startTime = performance.now();

  if (!query || !query.trim()) {
    return { results: [] };
  }

  ensureInitialized();

  const parseStart = performance.now();
  const tokens = mergePinyinTokens(parseQuery(query));
  const parseTime = performance.now() - parseStart;

  if (tokens.length === 0) {
    return { results: [] };
  }

  const db = getDatabase();

  // Build WHERE clause
  const conditions: string[] = [];
  const allParams: (string | number)[] = [];

  // Separate include and exclude tokens
  const includeTokens = tokens.filter((t) => !t.exclude);
  const excludeTokens = tokens.filter((t) => t.exclude);

  // Process include tokens (AND together)
  for (const token of includeTokens) {
    const [cond, params] = buildCondition(token);
    conditions.push(cond);
    allParams.push(...params);
  }

  // Process exclude tokens
  for (const token of excludeTokens) {
    const [cond, params] = buildCondition(token);
    conditions.push(cond);
    allParams.push(...params);
  }

  if (conditions.length === 0) {
    return { results: [] };
  }

  const whereClause = conditions.join(' AND ');

  // Build relevance ordering based on query type
  const orderClauses: string[] = [];
  const orderParams: (string | number)[] = [];

  // Detect query type for smart ordering
  for (const token of includeTokens) {
    if (!token.exclude) {
      const term = token.term.replace(/\*/g, '');
      if (token.field === 'pinyin' || isPinyin(term)) {
        // For pinyin: exact match first, then by frequency, then by length
        const normalized = normalizePinyinInput(term).replace(/ /g, '');
        orderClauses.push('CASE WHEN pinyin_nospace = ? THEN 0 ELSE 1 END');
        orderParams.push(normalized);
        orderClauses.push('frequency DESC');
        orderClauses.push('LENGTH(pinyin_search)');
      } else if (token.field === 'chinese' || isChinese(term)) {
        // For Chinese: exact match first, then by frequency, then by length
        orderClauses.push('CASE WHEN traditional = ? OR simplified = ? THEN 0 ELSE 1 END');
        orderParams.push(term, term);
        orderClauses.push('frequency DESC');
        orderClauses.push('LENGTH(traditional)');
      } else if (token.field === 'english') {
        // For English: entries starting with term first, then by frequency
        orderClauses.push('CASE WHEN definition LIKE ? THEN 0 WHEN definition LIKE ? THEN 1 ELSE 2 END');
        orderParams.push(`${term}%`, `% ${term}%`);
        orderClauses.push('frequency DESC');
        orderClauses.push('LENGTH(definition)');
      } else {
        // Auto-detected: prioritize by frequency, then shorter entries
        orderClauses.push('frequency DESC');
        orderClauses.push('LENGTH(traditional)');
      }
      break; // Only use first include token for ordering
    }
  }

  if (orderClauses.length === 0) {
    orderClauses.push('frequency DESC');
    orderClauses.push('traditional');
  }

  const orderBy = orderClauses.join(', ');

  const sql = `
    SELECT * FROM entries
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const finalParams = [...allParams, ...orderParams, limit, offset];

  const queryStart = performance.now();
  let results: DictEntry[];
  try {
    results = db.prepare(sql).all(...finalParams) as DictEntry[];
  } catch (e) {
    console.error('Search error:', e);
    results = [];
  }
  const queryTime = performance.now() - queryStart;
  const totalTime = performance.now() - startTime;

  if (debug) {
    return {
      results,
      debugInfo: {
        sql,
        params: finalParams,
        parseTime,
        queryTime,
        totalTime,
        tokenCount: tokens.length,
        tokens,
      },
    };
  }

  return { results };
}

/**
 * Get "Did you mean" suggestions for a query.
 */
export function getSuggestions(query: string, limit: number = 8): string[] {
  if (!query || !query.trim()) {
    return [];
  }

  ensureInitialized();
  query = query.toLowerCase().trim();

  if (isChinese(query) || query.length > 20) {
    return [];
  }

  const db = getDatabase();

  // For pinyin queries, use pinyin-aware suggestions
  if (isPinyin(query)) {
    return getPinyinSuggestions(query, db, limit);
  }

  const suggestions = new Set<string>();

  // Strategy 1: Find words with similar prefix
  const prefix = query.length >= 3 ? query.slice(0, 3) : query;
  const rows = db
    .prepare(`SELECT DISTINCT definition FROM entries WHERE definition LIKE ? LIMIT 100`)
    .all(`%${prefix}%`) as { definition: string }[];

  for (const row of rows) {
    // Extract words from definition
    const words = row.definition.toLowerCase().match(/\b[a-zA-Z]{3,}\b/g) || [];
    for (const word of words) {
      if (word !== query && isSimilar(query, word)) {
        suggestions.add(word);
        if (suggestions.size >= limit) break;
      }
    }
    if (suggestions.size >= limit) break;
  }

  // Strategy 2: Character transposition/substitution variants
  if (suggestions.size < limit) {
    const variants = generateVariants(query);
    for (const variant of variants.slice(0, 10)) {
      if (suggestions.size >= limit) break;
      const variantRows = db
        .prepare(`SELECT DISTINCT definition FROM entries WHERE definition LIKE ? LIMIT 3`)
        .all(`% ${variant} %`) as { definition: string }[];

      for (const row of variantRows) {
        const words = row.definition.toLowerCase().match(/\b[a-zA-Z]{3,}\b/g) || [];
        for (const word of words) {
          if (word === variant && word !== query) {
            suggestions.add(word);
          }
        }
      }
    }
  }

  return [...suggestions].slice(0, limit);
}

/**
 * Generate pinyin-aware suggestions by finding edit-distance-1 variants
 * that exist as actual pinyin entries in the database.
 */
function getPinyinSuggestions(query: string, db: ReturnType<typeof getDatabase>, limit: number): string[] {
  const normalized = normalizePinyinInput(query).replace(/ /g, '');
  const seen = new Set<string>();

  // Generate all edit-distance-1 variants
  const variants = generatePinyinVariants(normalized);

  // Deduplicate and remove identity
  const uniqueVariants: string[] = [];
  for (const v of variants) {
    if (v !== normalized && !seen.has(v) && v.length >= 2) {
      seen.add(v);
      uniqueVariants.push(v);
    }
  }

  // Sort by longest shared prefix with original (prefer changes later in the word)
  function sharedPrefixLen(v: string): number {
    for (let i = 0; i < Math.min(v.length, normalized.length); i++) {
      if (v[i] !== normalized[i]) return i;
    }
    return Math.min(v.length, normalized.length);
  }

  uniqueVariants.sort((a, b) => sharedPrefixLen(b) - sharedPrefixLen(a));

  // Check which variants exist in the database
  const suggestions: string[] = [];
  const checkStmt = db.prepare('SELECT 1 FROM entries WHERE pinyin_nospace = ? LIMIT 1');

  for (const variant of uniqueVariants) {
    if (checkStmt.get(variant)) {
      suggestions.push(variant);
      if (suggestions.length >= limit) break;
    }
  }

  return suggestions;
}

/**
 * Generate edit-distance-1 variants optimized for pinyin.
 */
function generatePinyinVariants(word: string): string[] {
  const variants: string[] = [];
  const pinyinChars = 'abcdefghijklmnopqrstuvwxyz';

  // Single character deletions
  for (let i = 0; i < word.length; i++) {
    variants.push(word.slice(0, i) + word.slice(i + 1));
  }

  // Adjacent transpositions
  for (let i = 0; i < word.length - 1; i++) {
    variants.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }

  // Single character substitutions
  for (let i = 0; i < word.length; i++) {
    for (const c of pinyinChars) {
      if (c !== word[i]) {
        variants.push(word.slice(0, i) + c + word.slice(i + 1));
      }
    }
  }

  // Single character insertions
  for (let i = 0; i <= word.length; i++) {
    for (const c of pinyinChars) {
      variants.push(word.slice(0, i) + c + word.slice(i));
    }
  }

  return variants;
}

/**
 * Check if two words are similar (simple edit distance check).
 */
function isSimilar(word1: string, word2: string): boolean {
  if (Math.abs(word1.length - word2.length) > 2) {
    return false;
  }

  // Simple check: same first letter and similar length
  if (word1[0] === word2[0] && Math.abs(word1.length - word2.length) <= 1) {
    // Count matching characters
    let matches = 0;
    const minLen = Math.min(word1.length, word2.length);
    for (let i = 0; i < minLen; i++) {
      if (word1[i] === word2[i]) matches++;
    }
    return matches >= Math.min(word1.length, word2.length) - 2;
  }

  return false;
}

/**
 * Generate spelling variants of a word.
 */
function generateVariants(word: string): string[] {
  const variants: string[] = [];

  // Single character deletions
  for (let i = 0; i < word.length; i++) {
    variants.push(word.slice(0, i) + word.slice(i + 1));
  }

  // Adjacent transpositions
  for (let i = 0; i < word.length - 1; i++) {
    variants.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }

  // Common substitutions
  const subs: Record<string, string> = { a: 'e', e: 'a', i: 'y', y: 'i', o: 'u', u: 'o' };
  for (let i = 0; i < word.length; i++) {
    if (word[i] in subs) {
      variants.push(word.slice(0, i) + subs[word[i]] + word.slice(i + 1));
    }
  }

  return variants;
}

/**
 * Segment Chinese text into words using longest-match-first (greedy) algorithm.
 * Returns list of [word, entries[]] tuples.
 */
export function segmentChinese(text: string, maxWordLen: number = 8): [string, DictEntry[]][] {
  if (!text) return [];

  ensureInitialized();

  // Filter to only Chinese characters
  const chineseChars = [...text].filter((c) => isChinese(c)).join('');
  if (!chineseChars) return [];

  const db = getDatabase();
  const wordSet = getWordSet(db);
  const lookupStmt = db.prepare('SELECT * FROM entries WHERE traditional = ? OR simplified = ? ORDER BY traditional');

  const segments: [string, DictEntry[]][] = [];
  let i = 0;

  while (i < chineseChars.length) {
    // Try to find the longest matching word starting at position i
    let bestMatch: string | null = null;
    let bestLen = 0;

    // Try lengths from maxWordLen down to 1
    for (let length = Math.min(maxWordLen, chineseChars.length - i); length > 0; length--) {
      const candidate = chineseChars.slice(i, i + length);
      if (wordSet.has(candidate)) {
        bestMatch = candidate;
        bestLen = length;
        break;
      }
    }

    if (bestMatch) {
      // Found a word in dictionary
      const entries = lookupStmt.all(bestMatch, bestMatch) as DictEntry[];
      segments.push([bestMatch, entries]);
      i += bestLen;
    } else {
      // No match found - take single character
      const char = chineseChars[i];
      const entries = lookupStmt.all(char, char) as DictEntry[];
      segments.push([char, entries]);
      i += 1;
    }
  }

  return segments;
}

// Cache the word set for segmentation
let _wordSet: Set<string> | null = null;

function getWordSet(db: ReturnType<typeof getDatabase>): Set<string> {
  if (!_wordSet) {
    _wordSet = new Set<string>();
    const rows = db.prepare('SELECT traditional, simplified FROM entries').all() as {
      traditional: string;
      simplified: string;
    }[];
    for (const row of rows) {
      _wordSet.add(row.traditional);
      _wordSet.add(row.simplified);
    }
  }
  return _wordSet;
}
