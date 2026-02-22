import Link from 'next/link';
import { EXAMPLE_QUERIES } from '@/lib/constants';
import { SearchForm } from '@/components/SearchForm';
import { SearchHistory } from '@/components/SearchHistory';

export default function HomePage() {
  return (
    <div className="home-container">
      <h1 className="site-title">Chinese Dictionary</h1>
      <p className="site-tagline">120,000+ entries with audio, stroke order, and 63,000+ example sentences</p>

      <SearchForm />

      <SearchHistory />

      <div className="home-features">
        <Link href="/idioms" className="home-feature-card">
          <span className="home-feature-icon">&#x6210;</span>
          <span className="home-feature-label">Idioms</span>
          <span className="home-feature-desc">Browse chengyu</span>
        </Link>
        <Link href="/lookup" className="home-feature-card">
          <span className="home-feature-icon">&#x6587;</span>
          <span className="home-feature-label">Lookup</span>
          <span className="home-feature-desc">Paste &amp; analyze text</span>
        </Link>
        <Link href="/hsk" className="home-feature-card">
          <span className="home-feature-icon">&#x5B66;</span>
          <span className="home-feature-label">HSK Study</span>
          <span className="home-feature-desc">Flashcard practice</span>
        </Link>
      </div>

      <div className="examples">
        <p className="examples-label">Try searching</p>
        <div className="example-grid">
          {EXAMPLE_QUERIES.map(([query, description]) => (
            <Link
              key={query}
              href={`/search?q=${encodeURIComponent(query)}`}
              className="example-card"
            >
              <span className="example-query">{query}</span>
              <span className="example-desc">{description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
