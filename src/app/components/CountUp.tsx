'use client';

import React, { useRef, useEffect, useState } from 'react';

// ── Shared glow style ─────────────────────────────────────────

export const GLOW_ON  = '0 0 24px rgba(45,212,191,0.7), 0 0 48px rgba(45,212,191,0.3)';
export const GLOW_OFF = '0 0 0px transparent';

// ── CountUp — refresh-rate number counter ─────────────────────
// A plain requestAnimationFrame loop: rAF fires once per display frame at
// the device's NATIVE refresh rate (60Hz, 120Hz, 144Hz…), so the count is
// perfectly smooth and matches the screen — no GSAP ticker indirection, no
// frame throttling. The previous version throttled DOM writes to every 4th
// frame (~15fps) as a perf lever, but the visible number-jumping read as
// lag in the pricing section. tabular-nums keeps digit widths stable, so
// the textContent writes never reflow the layout around the number.

interface CountUpProps {
  target: number;
  delay?: number;
  className?: string;
  prefix?: string;
  /** When provided, the count waits for `ready` to become true before starting.
   *  Used for hero stats that must wait for the splash screen + entrance animation. */
  ready?: boolean;
}

const DURATION = 2800;

// power3.out — fast start, gentle finish (same easing as the old GSAP tween)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({ target, delay = 0.3, className, prefix, ready }: CountUpProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [glow, setGlow] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (ready === false) return; // Wait for external trigger (e.g. splash screen)
    if (delay < 0) return; // Delay not yet computed — wait for position-based cascade
    const el = wrapperRef.current;
    if (!el) return;

    let alive = true;
    let raf = 0;

    const start = () => {
      // Schedule the count to begin after `delay` seconds from now
      const startAt = performance.now() + delay * 1000;

      const tick = (now: number) => {
        if (!alive) return;
        const elapsed = now - startAt;
        if (elapsed < 0) {
          raf = requestAnimationFrame(tick);
          return;
        }
        const t = Math.min(1, elapsed / DURATION);
        const v = Math.min(Math.round(target * easeOutCubic(t)), target);
        if (numRef.current) numRef.current.textContent = v.toLocaleString('it-IT');
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setGlow(true);
          setPulse(true);
          glowTimerRef.current = setTimeout(() => setGlow(false), 600);
          scaleTimerRef.current = setTimeout(() => setPulse(false), 400);
        }
      };

      raf = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
      if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
    };

    if (ready === true) {
      // Hero stats: start immediately after delay (no trigger needed)
      start();
      return cleanup;
    }

    // Price cards: start when the element enters the viewport (IO instead
    // of ScrollTrigger — no scroll event overhead, no position polling).
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || !alive) return;
        io.disconnect();
        start();
      },
      { rootMargin: '250px 0px' }
    );
    io.observe(el);
    return () => { io.disconnect(); cleanup(); };
  }, [target, delay, ready]);

  return (
    <span
      ref={wrapperRef}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'baseline',
        fontVariantNumeric: 'tabular-nums',
        textShadow: glow ? GLOW_ON : GLOW_OFF,
        transform: pulse ? 'scale(1.15)' : 'scale(1)',
        transition: glow
          ? 'text-shadow 0s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)'
          : 'text-shadow 500ms ease-out, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}
    >{prefix}<span ref={numRef}>0</span></span>
  );
}

// ── HeroGlow — lampo teal per numeri statici nella hero ────────

const HERO_GLOW_BASE_DELAY = 800;
const HERO_GLOW_STAGGER    = 200;

export function HeroGlow({ children, stagger = 0 }: { children: React.ReactNode; stagger?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [glow, setGlow] = useState(false);
  const triggeredRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || triggeredRef.current) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || triggeredRef.current) return;
      triggeredRef.current = true;
      io.disconnect();
      const delay = HERO_GLOW_BASE_DELAY + stagger * HERO_GLOW_STAGGER;
      setTimeout(() => {
        if (!mountedRef.current) return;
        setGlow(true);
        setTimeout(() => { if (mountedRef.current) setGlow(false); }, 700);
      }, delay);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { mountedRef.current = false; io.disconnect(); };
  }, [stagger]);

  return (
    <span
      ref={ref}
      style={{
        textShadow: glow ? GLOW_ON : GLOW_OFF,
        transition: glow ? 'none' : 'text-shadow 500ms ease-out',
      }}
    >{children}</span>
  );
}
