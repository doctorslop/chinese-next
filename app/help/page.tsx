import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help - Chinese Dictionary',
};

export default function HelpPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Search Help</h1>
        <p className="page-description">
          Search by English words, Chinese characters, or Mandarin Pinyin. The search bar
          auto-detects the input type.
        </p>
      </div>

      <div className="help-section">
        <h2>Basic Search</h2>
        <div className="help-examples">
          <div className="help-example-row">
            <span className="help-example-label">English</span>
            <span className="help-example-detail">
              Type any English word. Example: <Link href="/search?q=hello">hello</Link>
            </span>
          </div>
          <div className="help-example-row">
            <span className="help-example-label">Chinese</span>
            <span className="help-example-detail">
              Enter Chinese characters. Example: <Link href="/search?q=%E4%BD%A0%E5%A5%BD">&#x4F60;&#x597D;</Link>
            </span>
          </div>
          <div className="help-example-row">
            <span className="help-example-label">Pinyin</span>
            <span className="help-example-detail">
              With or without tone numbers. Example: <Link href="/search?q=nihao">nihao</Link> or <Link href="/search?q=ni3hao3">ni3hao3</Link>
            </span>
          </div>
        </div>
      </div>

      <div className="help-section">
        <h2>Pinyin Input</h2>
        <ul>
          <li>Tone numbers are optional: both <code>nihao</code> and <code>ni3hao3</code> work</li>
          <li>Use <code>v</code> for <code>&uuml;</code>: <code>lv4</code> for <code>l&uuml;</code></li>
          <li>Results always display tone marks regardless of input format</li>
        </ul>
      </div>

      <div className="help-section">
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
        <div className="help-examples">
          <div className="help-example-row">
            <code className="help-example-label">c:</code>
            <span className="help-example-detail">Chinese headwords only. Example: <code>c:&#x4E2A;</code></span>
          </div>
          <div className="help-example-row">
            <code className="help-example-label">p:</code>
            <span className="help-example-detail">Pinyin only. Example: <code>p:you</code></span>
          </div>
          <div className="help-example-row">
            <code className="help-example-label">e:</code>
            <span className="help-example-detail">English definitions only. Example: <code>e:you</code></span>
          </div>
        </div>

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
      </div>

      <div className="help-section">
        <h2>Audio</h2>
        <p>
          Click on any Pinyin syllable in the search results to hear its pronunciation.
        </p>
      </div>

      <div className="help-section">
        <h2>Word Frequency</h2>
        <p>
          Search results display a frequency tag next to entries. This helps you focus on commonly used words:
        </p>
        <div className="help-freq-tags">
          <div className="help-freq-row">
            <span className="freq-tag freq-very-common">100k+</span>
            <span>Very common &mdash; core vocabulary</span>
          </div>
          <div className="help-freq-row">
            <span className="freq-tag freq-common">10k+</span>
            <span>Common &mdash; 10k&ndash;100k occurrences</span>
          </div>
          <div className="help-freq-row">
            <span className="freq-tag freq-moderate">1k+</span>
            <span>Moderate &mdash; 1k&ndash;10k occurrences</span>
          </div>
          <div className="help-freq-row">
            <span className="freq-tag freq-uncommon">rare</span>
            <span>Uncommon &mdash; fewer than 1k</span>
          </div>
        </div>
      </div>

      <div className="help-section">
        <h2>Other Tools</h2>
        <div className="help-tools-grid">
          <Link href="/idioms" className="help-tool-card">
            <strong>Idiom Browser</strong>
            <span>Browse and search Chinese idioms (&#x6210;&#x8BED;) with character-by-character breakdowns</span>
          </Link>
          <Link href="/lookup" className="help-tool-card">
            <strong>Word-by-Word Lookup</strong>
            <span>Paste Chinese text and get word-by-word annotation with pinyin and definitions</span>
          </Link>
        </div>
      </div>

      <div className="back-link">
        <Link href="/">&#x2190; Home</Link>
      </div>
    </div>
  );
}
