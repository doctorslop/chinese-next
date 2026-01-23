import Link from 'next/link';
import { EXAMPLE_QUERIES } from '@/lib/constants';
import { SearchForm } from '@/components/SearchForm';

export default function HomePage() {
  return (
    <div className="home-container">
      <h1 className="site-title">ChineseDictionary</h1>
      <p className="tagline">Chinese-English Dictionary</p>

      <SearchForm />

      <div className="examples">
        <p>Try:</p>
        <ul className="example-list">
          {EXAMPLE_QUERIES.map(([query, description]) => (
            <li key={query}>
              <Link href={`/search?q=${encodeURIComponent(query)}`}>{query}</Link>
              <span className="example-desc">({description})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
