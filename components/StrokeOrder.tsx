'use client';

import { useEffect, useRef, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';

interface StrokeOrderProps {
  character: string;
}

export function StrokeOrder({ character }: StrokeOrderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Reset visibility in case a previous load hid the container
    el.style.display = '';
    while (el.firstChild) el.removeChild(el.firstChild);
    writerRef.current = null;

    let cancelled = false;

    try {
      const styles = getComputedStyle(document.documentElement);
      const resolveColor = (prop: string, fallback: string) =>
        styles.getPropertyValue(prop).trim() || fallback;

      const writer = HanziWriter.create(el, character, {
        width: 80,
        height: 80,
        padding: 6,
        showOutline: true,
        strokeColor: resolveColor('--fg', '#111'),
        outlineColor: resolveColor('--border', '#e0e0e0'),
        drawingColor: resolveColor('--muted', '#6b6b6b'),
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 200,
        charDataLoader: (char: string) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          return fetch(
            `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2/${char}.json`,
            { signal: controller.signal }
          )
            .then((res) => {
              clearTimeout(timeout);
              if (!res.ok) throw new Error('not found');
              return res.json();
            })
            .then((data) => {
              if (cancelled) return null;
              return data;
            })
            .catch(() => {
              clearTimeout(timeout);
              if (!cancelled && el) el.style.display = 'none';
              return null;
            });
        },
      });
      // Add viewBox so CSS display-size overrides scale the character
      // instead of clipping it (HanziWriter omits viewBox by default)
      el.querySelector('svg')?.setAttribute('viewBox', '0 0 80 80');
      writerRef.current = writer;
    } catch {
      el.style.display = 'none';
    }

    return () => {
      cancelled = true;
      while (el.firstChild) el.removeChild(el.firstChild);
      writerRef.current = null;
    };
  }, [character]);

  const animate = useCallback(() => {
    writerRef.current?.animateCharacter();
  }, []);

  return (
    <div className="stroke-order">
      <div ref={containerRef} className="stroke-order-canvas" onClick={animate} title="Click to animate stroke order" />
      <button className="stroke-order-btn" onClick={animate} aria-label="Animate stroke order">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>play</span>
      </button>
    </div>
  );
}
