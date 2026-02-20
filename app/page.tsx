import Link from 'next/link';
import { EXAMPLE_QUERIES } from '@/lib/constants';
import { SearchForm } from '@/components/SearchForm';
import { SearchHistory } from '@/components/SearchHistory';

export default function HomePage() {
  return (
    <div className="home-container">
      <h1 className="site-title">Chinese Dictionary</h1>
      <p className="site-tagline">120,000+ entries, search in English, Pinyin, or Chinese</p>

      <SearchForm />

      <SearchHistory />

      <div className="examples">
        <p className="examples-label">Try an example</p>
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
