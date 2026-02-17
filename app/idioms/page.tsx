import { Metadata } from 'next';
import Link from 'next/link';
import { searchIdioms, getIdiomBreakdown, type IdiomWithBreakdown } from '@/lib/idioms';
import { AudioLink } from '@/components/AudioLink';
import { ChineseLink } from '@/components/ChineseLink';

export const metadata: Metadata = {
  title: 'Idioms (成语) - Chinese Dictionary',
  description: 'Browse and search Chinese idioms (chengyu) with character-by-character breakdowns.',
};

interface IdiomsPageProps {
  searchParams: Promise<{ q?: string; word?: string; page?: string }>;
}

export default async function IdiomsPage({ searchParams }: IdiomsPageProps) {
  const params = await searchParams;
  const query = (params.q || '').trim();
  const word = (params.word || '').trim();
  let page = parseInt(params.page || '1', 10);
  if (isNaN(page) || page < 1) page = 1;

  const limit = 30;
  const offset = (page - 1) * limit;

  // If a specific word is requested, show its breakdown
  let breakdown: IdiomWithBreakdown | null = null;
  if (word) {
    breakdown = getIdiomBreakdown(word);
  }

  const { results, total } = searchIdioms(query, limit, offset);
  const hasNext = offset + limit < total;
  const hasPrev = page > 1;

  return (
    <div className="results-container">
      <h1>Idioms <span className="idiom-zh-title">成语</span></h1>
      <p className="idiom-subtitle">Browse Chinese idioms with character-by-character breakdowns</p>

      <form action="/idioms" method="get" className="search-form-small">
        <input
          type="text"
          name="q"
          className="search-input"
          placeholder="Search idioms..."
          defaultValue={query}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button type="submit" className="search-button">Search</button>
      </form>

      {breakdown && (
        <div className="idiom-breakdown-card">
          <div className="idiom-breakdown-header">
            <span className="idiom-breakdown-word">{breakdown.idiom.simplified}</span>
            {breakdown.idiom.traditional !== breakdown.idiom.simplified && (
              <span className="idiom-breakdown-trad">{breakdown.idiom.traditional}</span>
            )}
            <span className="idiom-breakdown-pinyin">
              {breakdown.idiom.syllables.map(([num, display], i) => (
                <AudioLink key={i} pinyinNum={num} pinyinDisplay={display} />
              ))}
            </span>
          </div>
          <div className="idiom-breakdown-def">
            <ChineseLink text={breakdown.idiom.definition} />
          </div>
          <div className="idiom-breakdown-chars">
            <div className="idiom-breakdown-label">Character breakdown</div>
            {breakdown.breakdown.map((char, i) => (
              <div key={i} className="idiom-char-row">
                <Link href={`/search?q=${encodeURIComponent(char.character)}`} className="idiom-char">{char.character}</Link>
                <span className="idiom-char-pinyin">{char.pinyin}</span>
                <span className="idiom-char-def">{char.definition.split(' / ').slice(0, 3).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 ? (
        <>
          <div className="idiom-grid">
            {results.map((idiom) => (
              <Link
                key={idiom.id}
                href={`/idioms?word=${encodeURIComponent(idiom.simplified)}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                className="idiom-card"
              >
                <span className="idiom-card-word">{idiom.simplified}</span>
                <span className="idiom-card-pinyin">{idiom.pinyin_display}</span>
                <span className="idiom-card-def">{idiom.definition.split(' / ').slice(0, 2).join(', ')}</span>
              </Link>
            ))}
          </div>
          {(hasNext || hasPrev) && (
            <div className="pagination">
              {hasPrev && (
                <Link
                  href={`/idioms?${query ? `q=${encodeURIComponent(query)}&` : ''}page=${page - 1}`}
                  className="page-link"
                >
                  Previous
                </Link>
              )}
              <span className="page-info">Page {page}</span>
              {hasNext && (
                <Link
                  href={`/idioms?${query ? `q=${encodeURIComponent(query)}&` : ''}page=${page + 1}`}
                  className="page-link"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="no-results">No idioms found{query ? ` for "${query}"` : ''}.</p>
      )}

      <div className="back-link">
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
