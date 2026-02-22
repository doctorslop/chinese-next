import Link from 'next/link';
import { ChineseLink } from './ChineseLink';
import type { ExampleSentence, ExampleUsage } from '@/lib/examples';

interface ExampleSentencesProps {
  word: string;
  sentences: ExampleSentence[];
  compounds: ExampleUsage[];
}

export function ExampleSentences({ word, sentences, compounds }: ExampleSentencesProps) {
  if (sentences.length === 0 && compounds.length === 0) return null;

  return (
    <div className="examples-section">
      {sentences.length > 0 && (
        <div className="example-sentences">
          <div className="examples-section-label">Example sentences for {word}</div>
          {sentences.map((s, i) => (
            <div key={i} className="example-sentence">
              <div className="example-zh"><ChineseLink text={s.chinese} /></div>
              {s.pinyin && <div className="example-py">{s.pinyin}</div>}
              <div className="example-en">{s.english}</div>
            </div>
          ))}
        </div>
      )}
      {compounds.length > 0 && (
        <div className="compound-words">
          <div className="examples-section-label">Words containing {word}</div>
          <div className="compound-list">
            {compounds.map((c, i) => (
              <Link key={i} href={`/search?q=${encodeURIComponent(c.word)}`} className="compound-item">
                <span className="compound-word">{c.word}</span>
                <span className="compound-pinyin">{c.pinyin}</span>
                <span className="compound-def">{c.definition.split(' / ').slice(0, 2).join(', ')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
