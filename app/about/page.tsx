import { Metadata } from 'next';
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
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">About</h1>
        <p className="page-description">
          Chinese Dictionary is a no-nonsense, easy to use Chinese-English dictionary created by volunteers.
        </p>
      </div>

      <div className="about-stat-card">
        <span className="about-stat-number">{formattedCount}+</span>
        <span className="about-stat-label">dictionary entries</span>
      </div>

      <div className="content-section">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature-item">
            <div className="feature-icon">&#x1F50D;</div>
            <div className="feature-text">
              <strong>Multi-language search</strong>
              <span>Search by English, Chinese characters, or Pinyin</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">&#x1F3AF;</div>
            <div className="feature-text">
              <strong>Auto-detection</strong>
              <span>Automatic detection of input type</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">&#x1F50A;</div>
            <div className="feature-text">
              <strong>Audio pronunciation</strong>
              <span>Hear pronunciation for every syllable</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">&#x270D;&#xFE0F;</div>
            <div className="feature-text">
              <strong>Stroke order</strong>
              <span>Animated stroke order diagrams</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">&#x7E41;&#x7C21;</div>
            <div className="feature-text">
              <strong>Both scripts</strong>
              <span>Simplified and traditional Chinese forms</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">&#x2699;&#xFE0F;</div>
            <div className="feature-text">
              <strong>Advanced search</strong>
              <span>Wildcards, exclusions, and field-specific queries</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content-section">
        <h2>Data Source</h2>
        <p>
          The dictionary data is sourced from the open CC-CEDICT dataset, a collaborative
          Chinese-English dictionary project maintained by the community.
        </p>
      </div>
    </div>
  );
}
