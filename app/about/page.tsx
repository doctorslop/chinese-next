import { Metadata } from 'next';
import Link from 'next/link';
import { getEntryCount, ensureInitialized } from '@/lib/db';

export const metadata: Metadata = {
  title: 'About - ChineseDictionary',
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
      <h1>About ChineseDictionary</h1>

      <p>
        ChineseDictionary is a no-nonsense, easy to use Chinese-English dictionary created by
        volunteers.
      </p>

      <p>
        Our dictionary contains <strong>over {formattedCount} entries</strong>, covering a broad
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

      <h2>Design Philosophy</h2>
      <p>
        We focus on essential dictionary features: a single search bar for queries, clear bilingual
        entries with tone-marked Pinyin and English definitions, and integrated Mandarin audio
        pronunciation. The design is intentionally simple with no user accounts, no login, and
        minimal distractions.
      </p>

      <div className="back-link">
        <Link href="/">&lt;&lt; back to the home page</Link>
      </div>
    </div>
  );
}
