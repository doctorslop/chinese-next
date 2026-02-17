import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { search, getSuggestions, segmentChinese } from '@/lib/search';
import { isChinese } from '@/lib/pinyin';
import { RESULTS_PER_PAGE, MAX_QUERY_LENGTH, MAX_PAGE } from '@/lib/constants';
import { findCompoundWords, getExampleSentences, type ExampleSentence, type ExampleUsage } from '@/lib/examples';
import { formatEntry } from '@/lib/format';
import { SearchForm } from '@/components/SearchForm';
import { EntryList, type FormattedEntry } from '@/components/EntryList';
import { Pagination } from '@/components/Pagination';
import { Suggestions } from '@/components/Suggestions';
import { SegmentedResults } from '@/components/SegmentedResults';
import { ExampleSentences } from '@/components/ExampleSentences';
import { StatsPanel } from '@/components/StatsPanel';
import Link from 'next/link';
import type { SearchDebugInfo } from '@/lib/search';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string; debug?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || '';
  return {
    title: query ? `${query} - Chinese Dictionary` : 'Search - Chinese Dictionary',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  let query = (params.q || '').trim();

  if (!query) {
    redirect('/');
  }

  if (query.length > MAX_QUERY_LENGTH) {
    query = query.slice(0, MAX_QUERY_LENGTH);
  }

  let page = parseInt(params.page || '1', 10);
  if (isNaN(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;

  const debugMode = params.debug === '1' && process.env.NODE_ENV !== 'production';

  let formattedResults: FormattedEntry[] = [];
  let suggestions: string[] = [];
  let segmentedResults: { word: string; entries: FormattedEntry[] }[] | null = null;
  let hasNext = false;
  const hasPrev = page > 1;
  let totalResults = 0;
  let errorMessage: string | null = null;
  let debugInfo: SearchDebugInfo | undefined = undefined;
  let exampleSentences: ExampleSentence[] = [];
  let compoundWords: ExampleUsage[] = [];

  try {
    const offset = (page - 1) * RESULTS_PER_PAGE;
    const searchResult = search(query, RESULTS_PER_PAGE + 1, offset, debugMode);
    const pageResults = searchResult.results;
    debugInfo = searchResult.debugInfo;

    hasNext = pageResults.length > RESULTS_PER_PAGE;

    const trimmedResults = hasNext ? pageResults.slice(0, RESULTS_PER_PAGE) : pageResults;
    totalResults = trimmedResults.length;

    formattedResults = trimmedResults.map(formatEntry);

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

    if (totalResults < 5 && !segmentedResults) {
      suggestions = getSuggestions(query, 8);
      suggestions = suggestions.filter((s) => s.toLowerCase() !== query.toLowerCase());
    }

    // Show example sentences and compound words for Chinese queries on page 1
    if (page === 1 && totalResults > 0 && isChinese(query)) {
      exampleSentences = getExampleSentences(query);
      compoundWords = findCompoundWords(query, 8);
    }
  } catch (e) {
    console.error(`Search error for query '${query}':`, e);
    errorMessage = 'An error occurred while searching. Please try again.';
  }

  return (
    <div className="results-container">
      <SearchForm defaultValue={query} compact />

      <p className="search-heading">
        Results for <strong>{query}</strong>
      </p>

      {errorMessage && (
        <div className="flash error">{errorMessage}</div>
      )}

      <Suggestions suggestions={suggestions} />

      {formattedResults.length > 0 ? (
        <>
          <EntryList results={formattedResults} />
          {(exampleSentences.length > 0 || compoundWords.length > 0) && (
            <ExampleSentences word={query} sentences={exampleSentences} compounds={compoundWords} />
          )}
          <Pagination query={query} page={page} hasNext={hasNext} hasPrev={hasPrev} />
        </>
      ) : segmentedResults ? (
        <SegmentedResults query={query} segments={segmentedResults} />
      ) : !errorMessage ? (
        <p className="no-results">No results found for &quot;{query}&quot;</p>
      ) : null}

      {debugInfo && (
        <StatsPanel debugInfo={debugInfo} resultCount={totalResults} page={page} />
      )}

      <div className="back-link">
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
