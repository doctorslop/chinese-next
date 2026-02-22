import { AudioLink } from './AudioLink';
import { StrokeOrder } from './StrokeOrder';
import { ChineseLink } from './ChineseLink';

export interface FormattedEntry {
  id: number;
  headword: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyin_display: string;
  syllables: [string, string][];
  definition: string;
  frequency: number;
}

interface EntryListProps {
  results: FormattedEntry[];
}

function getFrequencyInfo(freq: number): { label: string; rank: string; tooltip: string } | null {
  if (freq <= 0) return null;
  if (freq >= 100_000) return { label: 'Very Common', rank: 'very-common', tooltip: `Top-tier vocabulary (${freq.toLocaleString()} occurrences)` };
  if (freq >= 10_000) return { label: 'Common', rank: 'common', tooltip: `Frequently used (${freq.toLocaleString()} occurrences)` };
  if (freq >= 1_000) return { label: 'Moderate', rank: 'moderate', tooltip: `Moderately used (${freq.toLocaleString()} occurrences)` };
  return { label: 'Uncommon', rank: 'uncommon', tooltip: `Less frequently used (${freq.toLocaleString()} occurrences)` };
}

export function EntryList({ results }: EntryListProps) {
  if (results.length === 0) return null;

  return (
    <div className="results-list">
      {results.map((entry) => {
        const freqInfo = getFrequencyInfo(entry.frequency);
        return (
          <div key={entry.id} className="entry-card">
            <div className="entry-card-header">
              <div className="entry-card-hanzi">
                <span className="entry-card-headword">{entry.headword}</span>
                {entry.traditional !== entry.simplified && (
                  <span className="entry-card-trad">{entry.traditional}</span>
                )}
              </div>
              <div className="entry-card-pinyin">
                {entry.syllables.map(([pinyinNum, pinyinDisplay], i) => (
                  <AudioLink key={i} pinyinNum={pinyinNum} pinyinDisplay={pinyinDisplay} />
                ))}
              </div>
            </div>
            <div className="entry-card-body">
              <div className="entry-card-definition">
                <ChineseLink text={entry.definition} />
              </div>
              {freqInfo && (
                <span className={`freq-tag freq-${freqInfo.rank}`} title={freqInfo.tooltip}>
                  <span className="freq-dot" />
                  {freqInfo.label}
                </span>
              )}
            </div>
            <div className="entry-card-strokes">
              {[...entry.headword].map((char, i) => (
                <StrokeOrder key={`${entry.id}-${char}-${i}`} character={char} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
