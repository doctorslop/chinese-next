'use client';

import { useRef, useEffect, useState } from 'react';
import { SearchHistory, addToSearchHistory } from './SearchHistory';

interface SearchFormProps {
  defaultValue?: string;
  small?: boolean;
  compact?: boolean;
}

export function SearchForm({ defaultValue = '', small = false, compact = false }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (value.trim()) {
      addToSearchHistory(value.trim());
    }
  };

  const handleSelect = (query: string) => {
    setValue(query);
    addToSearchHistory(query);
    // Submit the form
    if (inputRef.current) {
      inputRef.current.value = query;
      inputRef.current.form?.submit();
    }
  };

  return (
    <div className="search-form-wrapper">
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="English, Chinese, or Pinyin..."
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
      <SearchHistory
        visible={focused && value.length === 0}
        filter={value}
        onSelect={handleSelect}
      />
    </div>
  );
}
