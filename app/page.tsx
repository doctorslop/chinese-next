import Link from 'next/link';
import { EXAMPLE_QUERIES } from '@/lib/constants';
import { SearchForm } from '@/components/SearchForm';

export default function HomePage() {
  return (
    <div className="home-container">
      <svg className="site-logo" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.464 3.464C2 4.93 2 7.286 2 12c0 4.714 0 7.071 1.464 8.535C4.93 22 7.286 22 12 22c4.714 0 7.071 0 8.535-1.465C22 19.072 22 16.714 22 12c0-4.714 0-7.071-1.465-8.536C19.072 2 16.714 2 12 2S4.929 2 3.464 3.464Z" fill="currentColor"/>
        <path d="M7 7.5h10M12 7.5V18M8 12.5l4 5.5 4-5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <h1 className="site-title">Chinese Dictionary</h1>
      <p className="tagline">Chinese-English Dictionary</p>

      <SearchForm />

      <div className="examples">
        <p className="examples-label">Example queries</p>
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
