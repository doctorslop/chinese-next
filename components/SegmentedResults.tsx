import { AudioLink } from './AudioLink';
import { CopyButton } from './CopyButton';
import type { FormattedEntry } from './EntryList';

interface SegmentedResultsProps {
  query: string;
  segments: {
    word: string;
    entries: FormattedEntry[];
  }[];
}

export function SegmentedResults({ query, segments }: SegmentedResultsProps) {
  if (!segments || segments.length === 0) return null;

  return (
    <>
      <p className="breakdown-intro">Character breakdown for &quot;{query}&quot;:</p>
      <div className="results-list breakdown-list">
        {segments.map((segment, segIndex) => (
          <div key={segIndex} className="breakdown-segment">
            {segment.entries.length > 0 ? (
              segment.entries.map((entry) => (
                <div key={entry.id} className="entry">
                  <div className="entry-field">
                    <div className="entry-label">Hanzi</div>
                    <div className="entry-value hanzi">
                      <span className="hanzi-text">{entry.headword}</span>
                      <CopyButton text={entry.headword} />
                    </div>
                  </div>
                  <div className="entry-field">
                    <div className="entry-label">Pinyin</div>
                    <div className="entry-value pinyin">
                      {entry.syllables.map(([pinyinNum, pinyinDisplay], i) => (
                        <AudioLink key={i} pinyinNum={pinyinNum} pinyinDisplay={pinyinDisplay} />
                      ))}
                    </div>
                  </div>
                  <div className="entry-field">
                    <div className="entry-label">English</div>
                    <div className="entry-value definition">{entry.definition}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="entry entry-not-found">
                <div className="entry-field">
                  <div className="entry-label">Hanzi</div>
                  <div className="entry-value hanzi">
                    <span className="hanzi-text">{segment.word}</span>
                    <CopyButton text={segment.word} />
                  </div>
                </div>
                <div className="entry-field">
                  <div className="entry-label">English</div>
                  <div className="entry-value definition">(not found in dictionary)</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
