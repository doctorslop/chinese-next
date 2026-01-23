'use client';

import { useRef, useEffect } from 'react';

interface SearchFormProps {
  defaultValue?: string;
  small?: boolean;
}

export function SearchForm({ defaultValue = '', small = false }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      action="/search"
      method="get"
      className={small ? 'search-form search-form-small' : 'search-form'}
    >
      <input
        ref={inputRef}
        type="text"
        name="q"
        className="search-input"
        defaultValue={defaultValue}
        placeholder="Enter English, Chinese, or Pinyin..."
      />
      <button type="submit" className="search-button">
        Search
      </button>
    </form>
  );
}
