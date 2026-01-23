import Link from 'next/link';

interface PaginationProps {
  query: string;
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function Pagination({ query, page, hasNext, hasPrev }: PaginationProps) {
  if (!hasPrev && !hasNext) return null;

  return (
    <div className="pagination">
      {hasPrev && (
        <Link
          href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
          className="page-link"
        >
          Previous
        </Link>
      )}
      <span className="page-info">Page {page}</span>
      {hasNext && (
        <Link
          href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
          className="page-link"
        >
          Next
        </Link>
      )}
    </div>
  );
}
