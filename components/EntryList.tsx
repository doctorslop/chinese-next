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
}

interface EntryListProps {
  results: FormattedEntry[];
}

export function EntryList({ results }: EntryListProps) {
  if (results.length === 0) return null;

  return (
    <div className="results-list">
      {results.map((entry) => (
        <div key={entry.id} className="entry">
          <div className="entry-field">
            <div className="entry-label">Hanzi</div>
            <div className="entry-value hanzi">
              <span>{entry.headword}</span>
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
      ))}
    </div>
  );
}
