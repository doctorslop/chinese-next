'use client';

import { toneMarkToNumber, getAudioFilename } from '@/lib/pinyin';

export interface FlashcardData {
  chinese: string;
  pinyin: string;
  english: string;
}

interface FlashcardProps {
  card: FlashcardData;
  isFlipped: boolean;
  onFlip: () => void;
  onPlayAudio: () => void;
}

export function Flashcard({ card, isFlipped, onFlip, onPlayAudio }: FlashcardProps) {
  return (
    <div className="flashcard-wrapper" onClick={onFlip}>
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <span className="flashcard-chinese">{card.chinese}</span>
          <button
            className="flashcard-audio-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio();
            }}
            aria-label="Play audio"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
        </div>
        <div className="flashcard-back">
          <span className="flashcard-pinyin">{card.pinyin}</span>
          <span className="flashcard-english">{card.english}</span>
          <button
            className="flashcard-audio-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio();
            }}
            aria-label="Play audio"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse pinyin with tone marks to get audio URLs for each syllable.
 * E.g., "nǐ hǎo" -> ["/audio/ni3.mp3", "/audio/hao3.mp3"]
 */
export function getAudioUrls(pinyin: string): string[] {
  const syllables = pinyin.split(/\s+/).filter(Boolean);
  return syllables.map((syllable) => {
    const numbered = toneMarkToNumber(syllable);
    const filename = getAudioFilename(numbered);
    return `/audio/${filename}`;
  });
}
