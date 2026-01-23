import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help - Chinese Dictionary',
};

export default function HelpPage() {
  return (
    <div className="content-page">
      <h1>Search Help</h1>

      <p>
        Search by English words, Chinese characters, or Mandarin Pinyin. The search bar
        auto-detects the input type.
      </p>

      <h2>Basic Search</h2>
      <ul>
        <li>
          <strong>English:</strong> Type any English word to find matching definitions.
          Example: <Link href="/search?q=hello">hello</Link>
        </li>
        <li>
          <strong>Chinese:</strong> Enter Chinese characters to find matching entries.
          Example: <Link href="/search?q=%E4%BD%A0%E5%A5%BD">&#x4F60;&#x597D;</Link>
        </li>
        <li>
          <strong>Pinyin:</strong> Type Pinyin with or without tone numbers.
          Example: <Link href="/search?q=nihao">nihao</Link> or{' '}
          <Link href="/search?q=ni3hao3">ni3hao3</Link>
        </li>
      </ul>

      <h2>Pinyin Input</h2>
      <ul>
        <li>Tone numbers are optional: both <code>nihao</code> and <code>ni3hao3</code> work</li>
        <li>Use <code>v</code> for <code>&uuml;</code>: <code>lv4</code> for <code>l&uuml;</code></li>
        <li>Results always display tone marks regardless of input format</li>
      </ul>

      <h2>Advanced Operators</h2>

      <h3>Wildcard (*)</h3>
      <p>Use <code>*</code> to match zero or more characters:</p>
      <ul>
        <li><code>chin*</code> &mdash; matches words starting with &quot;chin&quot;</li>
        <li><code>*&#x6587;</code> &mdash; matches words ending with &#x6587;</li>
        <li><code>*&#x4E2D;&#x56FD;*</code> &mdash; matches entries containing &#x4E2D;&#x56FD; anywhere</li>
      </ul>

      <h3>Exclusion (-)</h3>
      <p>Use <code>-</code> before a term to exclude entries containing it:</p>
      <ul>
        <li>
          <Link href="/search?q=apple+-phone">apple -phone</Link> &mdash; finds &quot;apple&quot; but excludes entries with &quot;phone&quot;
        </li>
      </ul>

      <h3>Field-Specific Search</h3>
      <p>Restrict searches to specific fields:</p>
      <ul>
        <li><code>c:</code> &mdash; Chinese headwords only. Example: <code>c:&#x4E2A;</code></li>
        <li><code>p:</code> &mdash; Pinyin only. Example: <code>p:you</code></li>
        <li><code>e:</code> &mdash; English definitions only. Example: <code>e:you</code></li>
      </ul>

      <h3>Exact Phrase (&quot;...&quot;)</h3>
      <p>Use double quotes for exact phrase matching:</p>
      <ul>
        <li>
          <Link href='/search?q=%22to+use%22'>&quot;to use&quot;</Link> &mdash; matches only entries where &quot;to&quot; is directly followed by &quot;use&quot;
        </li>
      </ul>

      <h3>Combining Operators</h3>
      <p>Operators can be combined in a single query:</p>
      <ul>
        <li><code>c:&#x597D; e:good</code> &mdash; Chinese headword &#x597D; with &quot;good&quot; in the definition</li>
        <li><code>e:&quot;thank you&quot;</code> &mdash; exact phrase in English definitions</li>
      </ul>

      <h2>Audio</h2>
      <p>
        Click on any Pinyin syllable in the search results to hear its pronunciation.
      </p>

      <div className="back-link">
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
