'use client';

import { useEffect, useRef, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';

interface StrokeOrderProps {
  character: string;
}

export function StrokeOrder({ character }: StrokeOrderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const hasDataRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear previous content
    el.innerHTML = '';
    writerRef.current = null;
    hasDataRef.current = true;

    try {
      const writer = HanziWriter.create(el, character, {
        width: 120,
        height: 120,
        padding: 8,
        showOutline: true,
        strokeColor: 'var(--fg, #111)',
        outlineColor: 'var(--border, #e0e0e0)',
        drawingColor: 'var(--muted, #6b6b6b)',
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 200,
        charDataLoader: (char: string) => {
          return fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2/${char}.json`)
            .then((res) => {
              if (!res.ok) throw new Error('not found');
              return res.json();
            })
            .catch(() => {
              hasDataRef.current = false;
              if (el) el.style.display = 'none';
              return null;
            });
        },
      });
      writerRef.current = writer;
    } catch {
      hasDataRef.current = false;
      el.style.display = 'none';
    }

    return () => {
      el.innerHTML = '';
      writerRef.current = null;
    };
  }, [character]);

  const animate = useCallback(() => {
    writerRef.current?.animateCharacter();
  }, []);

  return (
    <div className="stroke-order">
      <div ref={containerRef} className="stroke-order-canvas" onClick={animate} />
      <button className="stroke-order-btn" onClick={animate} aria-label="Animate stroke order">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </button>
    </div>
  );
}
