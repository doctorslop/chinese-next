'use client';

import { useEffect, useState } from 'react';

const HISTORY_KEY = 'search-history';
const MAX_HISTORY = 8;

export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(query: string): void {
  if (!query.trim()) return;
  const history = getSearchHistory();
  const filtered = history.filter((h) => h !== query);
  const updated = [query, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

interface SearchHistoryProps {
  onSelect: (query: string) => void;
  visible: boolean;
  filter?: string;
}

export function SearchHistory({ onSelect, visible, filter = '' }: SearchHistoryProps) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [visible]);

  if (!visible || history.length === 0) return null;

  const filtered = filter
    ? history.filter((h) => h.toLowerCase().includes(filter.toLowerCase()))
    : history;

  if (filtered.length === 0) return null;

  return (
    <div className="search-history">
      {filtered.slice(0, 5).map((query) => (
        <button
          key={query}
          type="button"
          className="search-history-item"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(query);
          }}
        >
          {query}
        </button>
      ))}
    </div>
  );
}
