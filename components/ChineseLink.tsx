import Link from 'next/link';

interface ChineseLinkProps {
  text: string;
}

/**
 * Renders text with Chinese characters wrapped in search links.
 * Non-Chinese text is rendered as-is.
 */
export function ChineseLink({ text }: ChineseLinkProps) {
  const segments = splitChineseSegments(text);

  return (
    <>
      {segments.map((seg, i) =>
        seg.isChinese ? (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(seg.text)}`}
            className="chinese-link"
            title={`Look up ${seg.text}`}
          >
            {seg.text}
          </Link>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

interface TextSegment {
  text: string;
  isChinese: boolean;
}

function isCJK(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df)
  );
}

function splitChineseSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentText = '';
  let currentIsChinese = false;

  for (const char of text) {
    const code = char.codePointAt(0)!;
    const charIsChinese = isCJK(code);

    if (currentText.length === 0) {
      currentText = char;
      currentIsChinese = charIsChinese;
    } else if (charIsChinese === currentIsChinese) {
      currentText += char;
    } else {
      segments.push({ text: currentText, isChinese: currentIsChinese });
      currentText = char;
      currentIsChinese = charIsChinese;
    }
  }

  if (currentText.length > 0) {
    segments.push({ text: currentText, isChinese: currentIsChinese });
  }

  return segments;
}
