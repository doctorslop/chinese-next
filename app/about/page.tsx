import { Metadata } from 'next';
import Link from 'next/link';
import { getEntryCount, ensureInitialized } from '@/lib/db';

export const metadata: Metadata = {
  title: 'About - Chinese Dictionary',
};

export default function AboutPage() {
  ensureInitialized();

  let entryCount = 0;
  try {
    entryCount = getEntryCount();
  } catch {
    entryCount = 0;
  }

  const formattedCount = entryCount.toLocaleString('en-US');

  return (
    <div className="content-page">
      <h1>About</h1>

      <p>
        Chinese Dictionary is a no-nonsense, easy to use Chinese-English dictionary created by
        volunteers.
      </p>

      <p>
        The dictionary contains <strong>over {formattedCount} entries</strong>, covering a broad
        vocabulary of words, idioms, and single-character entries. The data includes both simplified
        and traditional Chinese forms.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Search by English words, Chinese characters, or Mandarin Pinyin</li>
        <li>Automatic detection of input type</li>
        <li>Tone-marked Pinyin display</li>
        <li>Audio pronunciation for every syllable</li>
        <li>Both simplified and traditional Chinese forms</li>
        <li>Advanced search with wildcards, exclusions, and field-specific queries</li>
      </ul>

      <h2>Data Source</h2>
      <p>
        The dictionary data is sourced from the open CC-CEDICT dataset, a collaborative
        Chinese-English dictionary project maintained by the community.
      </p>

      <div className="back-link">
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
