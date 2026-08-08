'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  /** Milliseconds per character. Default 40ms. */
  speed?: number;
  /** Delay in ms before starting the typewriter (e.g. wait for line draw). */
  delay?: number;
  /** Called when all characters are revealed. */
  onComplete?: () => void;
  className?: string;
}

/**
 * Reveals characters one at a time when the parent ScrollReveal wrapper
 * gets the `revealed` class (or the element enters the viewport as fallback).
 * Uses MutationObserver on the parent for precise sync with GSAP ScrollTrigger,
 * with IntersectionObserver as a safety net if no ScrollReveal wrapper exists.
 * Supports delayed start and completion callback for animation sync.
 */
export default function TypewriterText({
  text,
  speed = 40,
  delay = 0,
  onComplete,
  className = '',
}: TypewriterTextProps) {
  const [visible, setVisible] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [started, setStarted] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const ref = useRef<HTMLSpanElement>(null);
  const triggeredRef = useRef(false);

  // Trigger when parent ScrollReveal gets the `revealed` class.
  // Falls back to IntersectionObserver if no ScrollReveal wrapper exists.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    triggeredRef.current = false;

    const fire = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      setTriggered(true);
    };

    // ── Path 1: parent already revealed (user scrolled here before mount) ──
    if (parent?.classList.contains('revealed')) {
      fire();
      return;
    }

    // ── Path 2: watch parent for the `revealed` class (ScrollReveal fires later) ──
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          if ((m.target as HTMLElement).classList.contains('revealed')) {
            fire();
            mo.disconnect();
            io.disconnect();
          }
        }
      }
    });
    if (parent) mo.observe(parent, { attributes: true, attributeFilter: ['class'] });

    // ── Path 3: IntersectionObserver fallback (no ScrollReveal wrapper) ──
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fire();
          mo.disconnect();
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(el);

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [text]);

  // Delay before starting the typewriter (e.g. wait for line draw)
  useEffect(() => {
    if (!triggered) return;
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [triggered, delay]);

  // Staggered character reveal
  useEffect(() => {
    if (!started) return;
    if (visible >= text.length) {
      if (!completedRef.current && text.length > 0) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setVisible((prev) => Math.min(prev + 1, text.length));
    }, visible === 0 ? 120 : speed);

    return () => clearTimeout(timer);
  }, [started, visible, text.length, speed]);

  // Reset when text changes (language switch)
  useEffect(() => {
    setVisible(0);
    setTriggered(false);
    setStarted(false);
    completedRef.current = false;
  }, [text]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          style={{
            opacity: i < visible ? 1 : 0,
            transition: 'opacity 0.08s ease-out',
          }}
          aria-hidden="true"
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
