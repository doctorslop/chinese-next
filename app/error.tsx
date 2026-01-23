'use client';

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-page">
      <h1>Something went wrong</h1>
      <p>An internal error occurred.</p>
      <button onClick={() => reset()} className="search-button">
        Try again
      </button>
      <div className="back-link">
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
