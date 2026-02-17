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
  if (freq >= 100_000) return 'very common';
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
          <div key={entry.id} className="entry">
            <div className="entry-field">
              <div className="entry-label">Hanzi</div>
              <div className="entry-value hanzi">
                <span>{entry.headword}</span>
                {entry.traditional !== entry.simplified && (
                  <span className="entry-traditional">{entry.traditional}</span>
                )}
                {freqLabel && (
                  <span className={`freq-tag freq-${freqRank?.replace(' ', '-')}`} title={`Frequency: ${entry.frequency.toLocaleString()} (${freqRank})`}>
                    {freqLabel}
                  </span>
                )}
                <div className="entry-strokes">
                  {[...entry.headword].map((char, i) => (
                    <StrokeOrder key={`${entry.id}-${char}-${i}`} character={char} />
                  ))}
                </div>
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
              <div className="entry-value definition">
                <ChineseLink text={entry.definition} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
