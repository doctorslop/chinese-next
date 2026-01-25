'use client';

import { useRef, useEffect } from 'react';

interface SearchFormProps {
  defaultValue?: string;
  compact?: boolean;
}

export function SearchForm({ defaultValue = '', compact = false }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      action="/search"
      method="get"
      className={compact ? 'search-form-small' : 'search-form'}
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
