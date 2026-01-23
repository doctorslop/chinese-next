import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="content-page">
      <h1>Error</h1>
      <p>Page not found</p>
      <p>
        <Link href="/">&lt;&lt; back to the home page</Link>
      </p>
    </div>
  );
}
