import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HSK 3.0 Flashcards - Chinese Dictionary',
  description: 'Study Chinese vocabulary with HSK 3.0 flashcards',
};

const HSK_LEVELS = [
  { level: '1', words: 497, description: 'Beginner' },
  { level: '2', words: 764, description: 'Elementary' },
  { level: '3', words: 966, description: 'Intermediate' },
  { level: '4', words: 995, description: 'Upper-Intermediate' },
  { level: '5', words: 1067, description: 'Advanced' },
  { level: '6', words: 1134, description: 'Proficient' },
];

const HSK_ADVANCED = { level: '7-9', words: 5619, description: 'Expert' };

export default function HSKPage() {
  return (
    <div className="hsk-container">
      <h1 className="hsk-title">HSK 3.0 Flashcards</h1>
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
            <span className="hsk-level-words">{words.toLocaleString()} words</span>
          </Link>
        ))}
        <Link
          href={`/hsk/${HSK_ADVANCED.level}`}
          className="hsk-level-card hsk-level-card-wide"
        >
          <span className="hsk-level-number">HSK {HSK_ADVANCED.level}</span>
          <span className="hsk-level-description">{HSK_ADVANCED.description}</span>
          <span className="hsk-level-words">{HSK_ADVANCED.words.toLocaleString()} words</span>
        </Link>
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
