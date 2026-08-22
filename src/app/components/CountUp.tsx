'use client';

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Ensure ScrollTrigger is registered (idempotent)
gsap.registerPlugin(ScrollTrigger);

// ── Shared glow style ─────────────────────────────────────────

export const GLOW_ON  = '0 0 24px rgba(45,212,191,0.7), 0 0 48px rgba(45,212,191,0.3)';
export const GLOW_OFF = '0 0 0px transparent';

// ── CountUp — GSAP-powered number counter ─────────────────────

interface CountUpProps {
  target: number;
  delay?: number;
  className?: string;
  prefix?: string;
  /** When provided, the count waits for `ready` to become true before starting.
   *  Used for hero stats that must wait for the splash screen + entrance animation. */
  ready?: boolean;
}

export function CountUp({ target, delay = 0.3, className, prefix, ready }: CountUpProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [glow, setGlow] = useState(false);
  const [pulse, setPulse] = useState(false);
  const frameRef = useRef(0);

  useEffect(() => {
    if (ready === false) return; // Wait for external trigger (e.g. splash screen)
    if (delay < 0) return; // Delay not yet computed — wait for position-based cascade
    const el = wrapperRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.to({ val: 0 }, {
        val: target,
        duration: 2.8,
        delay,
        ease: 'power3.out',
        // Only use ScrollTrigger when ready is undefined (price cards).
        // When ready is true (hero stats), the tween starts immediately after delay.
        ...(ready === undefined ? {
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        } : {}),
        onUpdate() {
          if (!numRef.current) return;
          // Throttle DOM writes to every 2nd frame (~30fps): each textContent
          // write invalidates style → UpdateLayoutTree. Writing every frame
          // (60fps) for 2.8s × the 5 hero counters was the dominant source of
          // Style & Layout work after splash (≈590ms real, ~2.4s throttled,
          // landing exactly on LCP). At 30fps the count is visually identical.
          frameRef.current++;
          if (frameRef.current % 2 !== 0) return;
          const v = this.targets()[0].val as number;
          const clamped = Math.min(Math.round(v), target);
          numRef.current.textContent = clamped.toLocaleString('it-IT');
        },
        onComplete() {
          setGlow(true);
          setPulse(true);
          glowTimerRef.current = setTimeout(() => setGlow(false), 600);
          scaleTimerRef.current = setTimeout(() => setPulse(false), 400);
        },
      });
    });

    return () => {
      ctx.revert();
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
      if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
    };
  }, [target, delay, ready]);

  return (
    <span
      ref={wrapperRef}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'baseline',
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
