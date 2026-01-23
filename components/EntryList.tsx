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
      {results.map((entry, index) => (
        <div key={entry.id} className={`entry${index % 2 === 1 ? ' entry-alt' : ''}`}>
          <span className="headword">{entry.headword}</span>
          <span className="pinyin">
            {entry.syllables.map(([pinyinNum, pinyinDisplay], i) => (
              <AudioLink key={i} pinyinNum={pinyinNum} pinyinDisplay={pinyinDisplay} />
            ))}
          </span>
          <span className="definition">{entry.definition}</span>
        </div>
      ))}
    </div>
  );
}
