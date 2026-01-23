import Link from 'next/link';

interface SuggestionsProps {
  suggestions: string[];
}

export function Suggestions({ suggestions }: SuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestions">
      Did you mean:{' '}
      {suggestions.map((suggestion, i) => (
        <span key={suggestion}>
          <Link href={`/search?q=${encodeURIComponent(suggestion)}`}>{suggestion}</Link>
          {i < suggestions.length - 1 ? ', ' : ''}
        </span>
      ))}
    </div>
  );
}
