'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Flashcard, FlashcardData, getAudioUrls } from '@/components/Flashcard';

interface FlashcardStudyProps {
  level: string;
}

interface HSKWord {
  traditional: string;
  simplified: string;
  pinyin: string;
  pinyinNumbered: string;
  english: string;
}

interface HSKData {
  metadata: {
    identifier: string;
    count: number;
  };
  words: HSKWord[];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const VALID_LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'];

export function FlashcardStudy({ level }: FlashcardStudyProps) {
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [displayCards, setDisplayCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load cards from JSON
  useEffect(() => {
    if (!VALID_LEVELS.includes(level)) {
      setError('Invalid HSK level.');
      setIsLoading(false);
      return;
    }

    fetch(`/data/hsk${level}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load vocabulary');
        return res.json() as Promise<HSKData>;
      })
      .then((data) => {
        const parsed: FlashcardData[] = data.words
          .map((word) => ({
            chinese: word.simplified,
            pinyin: word.pinyin,
            english: word.english,
          }))
          .filter((card) => card.chinese && card.pinyin);

        setCards(parsed);
        setDisplayCards(parsed);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [level]);

  const goNext = useCallback(() => {
    if (displayCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((i) => (i + 1) % displayCards.length);
  }, [displayCards.length]);

  const goPrev = useCallback(() => {
    if (displayCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((i) => (i - 1 + displayCards.length) % displayCards.length);
  }, [displayCards.length]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      if (!prev) {
        setDisplayCards(shuffleArray(cards));
      } else {
        setDisplayCards(cards);
      }
      setCurrentIndex(0);
      setIsFlipped(false);
      return !prev;
    });
  }, [cards]);

  const playAudio = useCallback(() => {
    if (displayCards.length === 0) return;

    const card = displayCards[currentIndex];
    const urls = getAudioUrls(card.pinyin);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Play each syllable sequentially
    let index = 0;
    const playNext = () => {
      if (index < urls.length) {
        const audio = new Audio(urls[index]);
        audioRef.current = audio;
        audio.onended = () => {
          index++;
          setTimeout(playNext, 100);
        };
        audio.onerror = () => {
          index++;
          playNext();
        };
        audio.play().catch(() => {
          index++;
          playNext();
        });
      }
    };
    playNext();
  }, [displayCards, currentIndex]);

  const flip = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          setIsFlipped((f) => !f);
          break;
        case 'ArrowRight':
        case 'j':
        case 'J':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'k':
        case 'K':
          e.preventDefault();
          goPrev();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          toggleShuffle();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          playAudio();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, toggleShuffle, playAudio]);

  if (isLoading) {
    return (
      <div className="hsk-study-container">
        <div className="hsk-loading">Loading HSK {level} vocabulary...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hsk-study-container">
        <div className="hsk-error">
          <p>{error}</p>
          <Link href="/hsk" className="hsk-back-link">
            Back to HSK levels
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = displayCards[currentIndex];

  return (
    <div className="hsk-study-container">
      <div className="hsk-study-header">
        <Link href="/hsk" className="hsk-back-link">
          ← HSK Levels
        </Link>
        <h1 className="hsk-study-title">HSK {level}</h1>
        <div className="hsk-progress">
          {currentIndex + 1} / {displayCards.length.toLocaleString()}
        </div>
      </div>

      {currentCard && (
        <Flashcard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={flip}
          onPlayAudio={playAudio}
        />
      )}

      <div className="hsk-controls">
        <button className="hsk-control-btn" onClick={goPrev} aria-label="Previous card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          className={`hsk-control-btn hsk-shuffle-btn ${isShuffled ? 'active' : ''}`}
          onClick={toggleShuffle}
          aria-label="Toggle shuffle"
          title="Shuffle (S)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
        </button>

        <button className="hsk-control-btn hsk-audio-btn" onClick={playAudio} aria-label="Play audio" title="Play (P)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>

        <button className="hsk-control-btn" onClick={goNext} aria-label="Next card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="hsk-shortcuts-hint">
        <span>Space to flip</span>
        <span>←→ to navigate</span>
        <span>S to shuffle</span>
      </div>
    </div>
  );
}
