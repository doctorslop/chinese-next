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

function formatFrequency(freq: number): string | null {
  if (freq <= 0) return null;
  if (freq >= 1_000_000) return `${(freq / 1_000_000).toFixed(1)}M`;
  if (freq >= 1_000) return `${(freq / 1_000).toFixed(1)}k`;
  return freq.toString();
}

function getFrequencyRank(freq: number): string | null {
  if (freq <= 0) return null;
  if (freq >= 100_000) return 'very-common';
  if (freq >= 10_000) return 'common';
  if (freq >= 1_000) return 'moderate';
  return 'uncommon';
}

export function EntryList({ results }: EntryListProps) {
  if (results.length === 0) return null;

  return (
    <div className="results-list">
      {results.map((entry) => {
        const freqLabel = formatFrequency(entry.frequency);
        const freqRank = getFrequencyRank(entry.frequency);
        return (
          <div key={entry.id} className="entry-card">
            <div className="entry-card-header">
              <div className="entry-card-hanzi">
                <span className="entry-card-headword">{entry.headword}</span>
                {entry.traditional !== entry.simplified && (
                  <span className="entry-card-trad">{entry.traditional}</span>
                )}
                {freqLabel && (
                  <span className={`freq-tag freq-${freqRank}`} title={`Frequency: ${entry.frequency.toLocaleString()} (${freqRank?.replace('-', ' ')})`}>
                    {freqLabel}
                  </span>
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
