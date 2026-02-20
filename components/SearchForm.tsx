'use client';

import { useRef, useEffect } from 'react';
import { addToSearchHistory } from './SearchHistory';

interface SearchFormProps {
  defaultValue?: string;
  small?: boolean;
  compact?: boolean;
}

export function SearchForm({ defaultValue = '', small = false, compact = false }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompact = small || compact;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const value = inputRef.current?.value?.trim();
    if (value) {
      addToSearchHistory(value);
    }
  };

  return (
    <form
      action="/search"
      method="get"
      className={isCompact ? 'search-form-small' : 'search-form'}
      onSubmit={handleSubmit}
    >
      <div className={isCompact ? 'search-input-wrap-small' : 'search-input-wrap'}>
        {!isCompact && (
          <svg className="search-input-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          name="q"
          className={isCompact ? 'search-input' : 'search-input search-input-hero'}
          defaultValue={defaultValue}
          placeholder={isCompact ? 'Search...' : 'English, Chinese, or Pinyin…'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {!isCompact && (
          <button type="submit" className="search-button search-button-hero" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        )}
      </div>
      {isCompact && (
        <button type="submit" className="search-button search-button-compact">
          Search
        </button>
      )}
    </form>
  );
}
