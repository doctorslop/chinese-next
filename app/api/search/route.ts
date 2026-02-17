/**
 * API route handler for search.
 * GET /api/search?q=...&page=...&debug=1
 *
 * Returns JSON matching the same data shape the search page uses.
 * Optional debug=1 param returns SQL and timing info (non-production only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { search, getSuggestions, segmentChinese } from '@/lib/search';
import { extractPinyinSyllables, isChinese } from '@/lib/pinyin';
import { RESULTS_PER_PAGE, MAX_QUERY_LENGTH, MAX_PAGE } from '@/lib/constants';

// Simple in-memory rate limiter: max requests per window per IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_MAP_MAX = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function evictExpired(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    // Evict expired entries if map is getting large
    if (rateLimitMap.size >= RATE_LIMIT_MAP_MAX) {
      evictExpired();
      // If still at capacity after eviction, drop the oldest
      if (rateLimitMap.size >= RATE_LIMIT_MAP_MAX) {
        const firstKey = rateLimitMap.keys().next().value;
        if (firstKey !== undefined) rateLimitMap.delete(firstKey);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodic cleanup (every 2 minutes)
const _cleanupInterval = setInterval(evictExpired, 2 * 60_000);
if (typeof _cleanupInterval === 'object' && 'unref' in _cleanupInterval) {
  _cleanupInterval.unref();
}

interface FormattedEntry {
  id: number;
  headword: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyin_display: string;
  syllables: [string, string][];
  definition: string;
}

function formatEntry(entry: {
  id: number;
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyin_display: string;
  definition: string;
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
  };
}

export async function GET(request: NextRequest) {
  // Rate limiting by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  let query = (searchParams.get('q') || '').trim();
  const debugMode = searchParams.get('debug') === '1' && process.env.NODE_ENV !== 'production';

  if (!query) {
    return NextResponse.json({ results: [], query: '', result_count: 0 });
  }

  // Input validation - limit query length
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.slice(0, MAX_QUERY_LENGTH);
  }

  // Get page number (default to 1)
  let page = parseInt(searchParams.get('page') || '1', 10);
  if (isNaN(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;

  try {
    // Perform search using SQL OFFSET/LIMIT - fetch one extra to detect next page
    const offset = (page - 1) * RESULTS_PER_PAGE;
    const { results: pageResults, debugInfo } = search(
      query,
      RESULTS_PER_PAGE + 1,
      offset,
      debugMode
    );

    const hasNext = pageResults.length > RESULTS_PER_PAGE;
    const hasPrev = page > 1;

    // Trim the extra result used for next-page detection
    const trimmedResults = hasNext ? pageResults.slice(0, RESULTS_PER_PAGE) : pageResults;
    const totalResults = trimmedResults.length;

    // Format results for display
    const formattedResults = trimmedResults.map(formatEntry);

    // Check if this is Chinese text that could be segmented
    let segmentedResults: { word: string; entries: FormattedEntry[] }[] | null = null;
    const chineseChars = [...query].filter((c) => isChinese(c)).join('');

    if (totalResults === 0 && chineseChars.length > 1) {
      const segments = segmentChinese(query);
      if (segments.length > 0) {
        segmentedResults = segments.map(([word, entries]) => ({
          word,
          entries: entries.map(formatEntry),
        }));
      }
    }

    // Get suggestions if no results or few results (and not segmented)
    let suggestions: string[] = [];
    if (totalResults < 5 && !segmentedResults) {
      suggestions = getSuggestions(query, 8);
      // Remove the query itself from suggestions
      suggestions = suggestions.filter((s) => s.toLowerCase() !== query.toLowerCase());
    }

    const response: Record<string, unknown> = {
      query,
      results: formattedResults,
      result_count: totalResults,
      suggestions,
      segmented_results: segmentedResults,
      page,
      has_next: hasNext,
      has_prev: hasPrev,
    };

    if (debugMode && debugInfo) {
      response.debug = debugInfo;
    }

    return NextResponse.json(response);
  } catch (e) {
    console.error(`Search error for query '${query}':`, e);
    return NextResponse.json(
      {
        query,
        results: [],
        result_count: 0,
        suggestions: [],
        segmented_results: null,
        page: 1,
        has_next: false,
        has_prev: false,
        error: 'An error occurred while searching.',
      },
      { status: 500 }
    );
  }
}
