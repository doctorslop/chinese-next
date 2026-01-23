import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help - ChineseDictionary',
};

export default function HelpPage() {
  return (
    <div className="content-page">
      <h1>Search Help</h1>

      <p>
        ChineseDictionary allows you to search by English words, Chinese characters, or Mandarin
        Pinyin. The search bar auto-detects the input type.
      </p>

      <h2>Basic Search</h2>
      <ul>
        <li>
          <strong>English words:</strong> Type any English word to find entries with that word in the
          definition. Example: <Link href="/search?q=hello">hello</Link>
        </li>
        <li>
          <strong>Chinese characters:</strong> Enter Chinese characters to find matching entries.
          Example: <Link href="/search?q=%E4%BD%A0%E5%A5%BD">你好</Link>
        </li>
        <li>
          <strong>Pinyin:</strong> Type Pinyin with or without tone numbers. Example:{' '}
          <Link href="/search?q=nihao">nihao</Link> or{' '}
          <Link href="/search?q=ni3hao3">ni3hao3</Link>
        </li>
      </ul>

      <h2>Pinyin Input</h2>
      <ul>
        <li>
          Tone numbers are optional: both <code>nihao</code> and <code>ni3hao3</code> work
        </li>
        <li>
          Use <code>v</code> for the <code>ü</code> vowel: <code>lv4</code> for <code>lǜ</code>
        </li>
        <li>Results always display tone marks regardless of how you input</li>
      </ul>

      <h2>Advanced Search Operators</h2>

      <h3>Wildcard (*)</h3>
      <p>
        Use <code>*</code> to match zero or more characters:
      </p>
      <ul>
        <li>
          <code>chin*</code> - matches words starting with &quot;chin&quot; (China, Chinese, etc.)
        </li>
        <li>
          <code>*文</code> - matches words ending with 文 (中文, 英文, etc.)
        </li>
        <li>
          <code>b*g</code> - matches words starting with b and ending with g
        </li>
        <li>
          <code>*中国*</code> - matches entries containing 中国 anywhere
        </li>
      </ul>

      <h3>Exclusion (-)</h3>
      <p>
        Use <code>-</code> before a term to exclude entries containing that term:
      </p>
      <ul>
        <li>
          <Link href="/search?q=apple+-phone">apple -phone</Link> - finds &quot;apple&quot; but
          excludes entries with &quot;phone&quot;
        </li>
      </ul>

      <h3>Field-Specific Search</h3>
      <p>Restrict your search to specific fields:</p>
      <ul>
        <li>
          <code>c:</code> - search Chinese headwords only. Example: <code>c:个</code>
        </li>
        <li>
          <code>p:</code> - search Pinyin only. Example: <code>p:you</code>
        </li>
        <li>
          <code>e:</code> - search English definitions only. Example: <code>e:you</code>
        </li>
      </ul>

      <h3>Exact Phrase (&quot;...&quot;)</h3>
      <p>Use double quotes for exact phrase matching:</p>
      <ul>
        <li>
          <Link href='/search?q=%22to+use%22'>&quot;to use&quot;</Link> - matches only entries where
          &quot;to&quot; is directly followed by &quot;use&quot;
        </li>
      </ul>

      <h3>Combining Operators</h3>
      <p>You can combine operators in a single query:</p>
      <ul>
        <li>
          <code>c:好 e:good</code> - Chinese headword 好 with &quot;good&quot; in the definition
        </li>
        <li>
          <code>e:&quot;thank you&quot;</code> - exact phrase &quot;thank you&quot; in English
          definitions
        </li>
        <li>
          <code>-&quot;to use&quot;</code> - exclude entries containing the phrase &quot;to
          use&quot;
        </li>
      </ul>

      <h2>Audio Pronunciation</h2>
      <p>
        Click on any Pinyin syllable in the search results to hear its pronunciation. Each syllable
        is clickable and plays the corresponding audio.
      </p>

      <div className="back-link">
        <Link href="/">&lt;&lt; back to the home page</Link>
      </div>
    </div>
  );
}
