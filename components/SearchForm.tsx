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
      className={small || compact ? 'search-form-small' : 'search-form'}
      onSubmit={handleSubmit}
    >
      <input
        ref={inputRef}
        type="text"
        name="q"
        className="search-input"
        defaultValue={defaultValue}
        placeholder="English, Chinese, or Pinyin..."
      />
      <button type="submit" className="search-button">
        Search
      </button>
    </form>
  );
}
