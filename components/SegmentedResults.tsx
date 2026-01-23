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
                <div key={entry.id} className="entry">
                  <span className="headword">{entry.headword}</span>
                  <span className="pinyin">
                    {entry.syllables.map(([pinyinNum, pinyinDisplay], i) => (
                      <AudioLink key={i} pinyinNum={pinyinNum} pinyinDisplay={pinyinDisplay} />
                    ))}
                  </span>
                  <span className="definition">{entry.definition}</span>
                </div>
              ))
            ) : (
              <div className="entry entry-not-found">
                <span className="headword">{segment.word}</span>
                <span className="definition">(not found in dictionary)</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
