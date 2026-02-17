import { Metadata } from 'next';
import Link from 'next/link';
import { segmentChinese } from '@/lib/search';
import { extractPinyinSyllables, isChinese } from '@/lib/pinyin';
import { AudioLink } from '@/components/AudioLink';

export const metadata: Metadata = {
  title: 'Word-by-Word Lookup - Chinese Dictionary',
  description: 'Paste Chinese text to get word-by-word translations with pinyin and English definitions.',
};

interface LookupPageProps {
  searchParams: Promise<{ text?: string }>;
}

export default async function LookupPage({ searchParams }: LookupPageProps) {
  const params = await searchParams;
  const text = (params.text || '').trim().slice(0, 500);

  let segments: { word: string; pinyin: string; syllables: [string, string][]; definition: string; found: boolean }[] = [];

  if (text && isChinese(text)) {
    const rawSegments = segmentChinese(text);
    segments = rawSegments.map(([word, entries]) => {
      if (entries.length > 0) {
        const best = entries[0];
        return {
          word,
          pinyin: best.pinyin_display,
          syllables: extractPinyinSyllables(best.pinyin),
          definition: best.definition,
          found: true,
        };
      }
      return {
        word,
        pinyin: '',
        syllables: [],
        definition: '',
        found: false,
      };
    });
  }

  return (
    <div className="lookup-container">
      <h1>Word-by-Word Lookup</h1>
      <p className="lookup-subtitle">Paste Chinese text to see each word annotated with pinyin and English</p>

      <form action="/lookup" method="get">
        <div className="lookup-input-form">
          <textarea
            name="text"
            className="lookup-textarea"
            placeholder="Paste Chinese text here... e.g. 我今天去学校学习中文"
            defaultValue={text}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="search-button lookup-submit">Lookup</button>
        </div>
      </form>

      {text && segments.length > 0 && (
        <>
          <div className="lookup-source">
            {segments.map((seg, i) => (
              <Link
                key={i}
                href={`/search?q=${encodeURIComponent(seg.word)}`}
                className="lookup-word-link"
                title={seg.found ? `${seg.pinyin} — ${seg.definition.split(' / ').slice(0, 2).join(', ')}` : seg.word}
              >
                {seg.word}
              </Link>
            ))}
          </div>

          <div className="lookup-results">
            {segments.map((seg, i) => (
              <div key={i} className="lookup-word-entry">
                {seg.found ? (
                  <>
                    <Link href={`/search?q=${encodeURIComponent(seg.word)}`} className="lookup-word-zh">{seg.word}</Link>
                    <span className="lookup-word-py">
                      {seg.syllables.map(([num, display], j) => (
                        <AudioLink key={j} pinyinNum={num} pinyinDisplay={display} />
                      ))}
                    </span>
                    <span className="lookup-word-en">{seg.definition.split(' / ').slice(0, 4).join(' / ')}</span>
                  </>
                ) : (
                  <span className="lookup-word-unknown">{seg.word} — (not in dictionary)</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {text && segments.length === 0 && (
        <p className="no-results">No Chinese text detected. Please enter Chinese characters.</p>
      )}

      <div className="back-link">
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
