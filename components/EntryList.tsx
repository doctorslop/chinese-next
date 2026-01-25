import { AudioLink } from './AudioLink';

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
            <div className="entry-value hanzi">{entry.headword}</div>
          </div>
          <div className="entry-field">
            <div className="entry-label">Pinyin</div>
            <div className="entry-value pinyin">
              {entry.syllables.map(([pinyinNum, pinyinDisplay], i) => (
                <AudioLink key={`${entry.id}-${pinyinNum}-${i}`} pinyinNum={pinyinNum} pinyinDisplay={pinyinDisplay} />
              ))}
            </div>
          </div>
          <div className="entry-field">
            <div className="entry-label">English</div>
            <div className="entry-value definition">{entry.definition}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
