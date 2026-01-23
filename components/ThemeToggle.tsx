'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.getAttribute('data-theme');
    setTheme(stored === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  if (!mounted) return null;

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  );
}
