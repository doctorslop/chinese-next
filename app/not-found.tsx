import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="error-page not-found-page">
      <div className="not-found-char">迷</div>
      <h1>Page not found</h1>
      <p className="not-found-pinyin">mí — lost, confused</p>
      <p>Looks like you&apos;ve wandered off the path. This page doesn&apos;t exist.</p>
      <div className="not-found-actions">
        <Link href="/" className="search-button">
          Search the dictionary
        </Link>
        <Link href="/idioms" className="not-found-link">
          Browse idioms
        </Link>
      </div>
      <p className="not-found-funfact">
        Fun fact: The character 迷 (mí) combines the radical for &quot;road&quot; (辶) with
        &quot;rice&quot; (米) — like being lost in a rice field.
      </p>
    </div>
  );
}
