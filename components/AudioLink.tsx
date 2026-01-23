'use client';

import { getAudioFilename } from '@/lib/pinyin';

interface AudioLinkProps {
  pinyinNum: string;
  pinyinDisplay: string;
}

export function AudioLink({ pinyinNum, pinyinDisplay }: AudioLinkProps) {
  const audioFile = getAudioFilename(pinyinNum);
  return (
    <a
      href="#"
      className="pinyin-audio"
      data-audio={`/audio/${audioFile}`}
    >
      {pinyinDisplay}
    </a>
  );
}
