import { AudioLink } from './AudioLink';
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
                <div key={entry.id} className="entry-card">
                  <div className="entry-card-header">
                    <div className="entry-card-hanzi">
                      <span className="entry-card-headword">{entry.headword}</span>
                    </div>
                    <div className="entry-card-pinyin">
                      {entry.syllables.map(([pinyinNum, pinyinDisplay], i) => (
                        <AudioLink key={i} pinyinNum={pinyinNum} pinyinDisplay={pinyinDisplay} />
                      ))}
                    </div>
                  </div>
                  <div className="entry-card-body">
                    <div className="entry-card-definition">{entry.definition}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="entry-card entry-card-notfound">
                <div className="entry-card-header">
                  <div className="entry-card-hanzi">
                    <span className="entry-card-headword">{segment.word}</span>
                  </div>
                </div>
                <div className="entry-card-body">
                  <div className="entry-card-definition entry-card-definition-muted">(not found in dictionary)</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
