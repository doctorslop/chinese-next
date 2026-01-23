'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="content-page">
      <h1>Error</h1>
      <p>An internal error occurred</p>
      <p>
        <button onClick={() => reset()} className="search-button">
          Try again
        </button>
      </p>
      <p>
        <Link href="/">&lt;&lt; back to the home page</Link>
      </p>
    </div>
  );
}
