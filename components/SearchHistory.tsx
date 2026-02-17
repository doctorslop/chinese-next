'use client';

import { useSyncExternalStore, useCallback } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'search-history';
const MAX_HISTORY = 20;

const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: string[] = [];
let cachedSnapshot: string[] = [];
let snapshotRaw = '';

function updateSnapshot() {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY) || '[]';
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    try {
      const parsed = JSON.parse(raw);
      cachedSnapshot = Array.isArray(parsed) ? parsed : [];
    } catch {
      cachedSnapshot = [];
    }
  }
}

function notifyListeners() {
  updateSnapshot();
  listeners.forEach((l) => l());
}

export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addToSearchHistory(query: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const history = getSearchHistory();
    const filtered = history.filter((h) => h !== trimmed);
    filtered.unshift(trimmed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
    notifyListeners();
  } catch {
    // localStorage full or unavailable
  }
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  } catch {
    // ignore
  }
}

// Eagerly initialize snapshot on the client so getSnapshot is side-effect free
if (typeof window !== 'undefined') {
  updateSnapshot();
}

function useSearchHistory(): string[] {
  const subscribe = useCallback((callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => cachedSnapshot,
    () => SERVER_SNAPSHOT
  );
}

export function SearchHistory() {
  const history = useSearchHistory();

  if (history.length === 0) return null;

  const handleClear = () => {
    clearSearchHistory();
  };

  return (
    <div className="search-history">
      <div className="search-history-header">
        <span className="search-history-label">Recent</span>
        <button className="search-history-clear" onClick={handleClear}>
          Clear
        </button>
      </div>
      <div className="search-history-list">
        {history.slice(0, 8).map((query) => (
          <Link
            key={query}
            href={`/search?q=${encodeURIComponent(query)}`}
            className="search-history-item"
          >
            {query}
          </Link>
        ))}
      </div>
    </div>
  );
}
