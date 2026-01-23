import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { search, getSuggestions, segmentChinese } from '@/lib/search';
import { extractPinyinSyllables, isChinese } from '@/lib/pinyin';
import { RESULTS_PER_PAGE, MAX_QUERY_LENGTH, MAX_PAGE } from '@/lib/constants';
import { SearchForm } from '@/components/SearchForm';
import { EntryList, type FormattedEntry } from '@/components/EntryList';
import { Pagination } from '@/components/Pagination';
import { Suggestions } from '@/components/Suggestions';
import { SegmentedResults } from '@/components/SegmentedResults';
import Link from 'next/link';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
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

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || '';
  return {
    title: query ? `Search: ${query} - ChineseDictionary` : 'Search - ChineseDictionary',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  let query = (params.q || '').trim();

  // Redirect to home if no query
  if (!query) {
    redirect('/');
  }

  // Input validation - limit query length
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.slice(0, MAX_QUERY_LENGTH);
  }

  // Get page number (default to 1)
  let page = parseInt(params.page || '1', 10);
  if (isNaN(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;

  let formattedResults: FormattedEntry[] = [];
  let suggestions: string[] = [];
  let segmentedResults: { word: string; entries: FormattedEntry[] }[] | null = null;
  let hasNext = false;
  let hasPrev = page > 1;
  let totalResults = 0;
  let errorMessage: string | null = null;

  try {
    // Perform search using SQL OFFSET/LIMIT - fetch one extra to detect next page
    const offset = (page - 1) * RESULTS_PER_PAGE;
    const { results: pageResults } = search(query, RESULTS_PER_PAGE + 1, offset);

    hasNext = pageResults.length > RESULTS_PER_PAGE;

    // Trim the extra result used for next-page detection
    const trimmedResults = hasNext ? pageResults.slice(0, RESULTS_PER_PAGE) : pageResults;
    totalResults = trimmedResults.length;

    // Format results for display
    formattedResults = trimmedResults.map(formatEntry);

    // Check if this is Chinese text that could be segmented
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
    if (totalResults < 5 && !segmentedResults) {
      suggestions = getSuggestions(query, 8);
      suggestions = suggestions.filter((s) => s.toLowerCase() !== query.toLowerCase());
    }
  } catch (e) {
    console.error(`Search error for query '${query}':`, e);
    errorMessage = 'An error occurred while searching. Please try again.';
  }

  return (
    <div className="results-container">
      <SearchForm defaultValue={query} compact />

      <h2 className="search-heading">Search: {query}</h2>

      {errorMessage && (
        <div className="flash error">{errorMessage}</div>
      )}

      <Suggestions suggestions={suggestions} />

      {formattedResults.length > 0 ? (
        <>
          <EntryList results={formattedResults} />
          <Pagination query={query} page={page} hasNext={hasNext} hasPrev={hasPrev} />
        </>
      ) : segmentedResults ? (
        <SegmentedResults query={query} segments={segmentedResults} />
      ) : !errorMessage ? (
        <p className="no-results">No results found for &quot;{query}&quot;.</p>
      ) : null}

      <div className="back-link">
        <Link href="/">&lt;&lt; back to the home page</Link>
      </div>
    </div>
  );
}
