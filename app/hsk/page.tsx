import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HSK Flashcards - Chinese Dictionary',
  description: 'Study Chinese vocabulary with HSK flashcards',
};

const HSK_LEVELS = [
  { level: 1, words: 150, description: 'Beginner' },
  { level: 2, words: 150, description: 'Elementary' },
  { level: 3, words: 300, description: 'Intermediate' },
  { level: 4, words: 600, description: 'Upper-Intermediate' },
  { level: 5, words: 1300, description: 'Advanced' },
  { level: 6, words: 2500, description: 'Proficient' },
];

export default function HSKPage() {
  return (
    <div className="hsk-container">
      <h1 className="hsk-title">HSK Flashcards</h1>
      <p className="hsk-subtitle">
        Study vocabulary for the Chinese proficiency test
      </p>

      <div className="hsk-levels">
        {HSK_LEVELS.map(({ level, words, description }) => (
          <Link
            key={level}
            href={`/hsk/${level}`}
            className="hsk-level-card"
          >
            <span className="hsk-level-number">HSK {level}</span>
            <span className="hsk-level-description">{description}</span>
            <span className="hsk-level-words">{words} words</span>
          </Link>
        ))}
      </div>

      <div className="hsk-info">
        <h2>Keyboard Shortcuts</h2>
        <ul>
          <li><code>Space</code> or <code>Enter</code> — Flip card</li>
          <li><code>→</code> or <code>J</code> — Next card</li>
          <li><code>←</code> or <code>K</code> — Previous card</li>
          <li><code>S</code> — Toggle shuffle</li>
          <li><code>P</code> — Play audio</li>
        </ul>
      </div>
    </div>
  );
}
