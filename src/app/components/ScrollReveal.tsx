'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REVEAL_DEFAULTS } from '@/lib/animation-theme';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** How far the element slides up from, in px. Default 40 */
  yOffset?: number;
  /** How far the element slides horizontally from, in px. Negative = from left, positive = from right. Default 0 */
  xOffset?: number;
  /** Duration of the animation in seconds. Default 0.8 */
  duration?: number;
  /** Delay before animation starts. Default 0 */
  delay?: number;
  /** Whether to scrub (tie animation to scroll position for two-way reveal). Default true */
  scrub?: boolean;
  /** Start trigger: top of element reaches bottom of viewport. Default 'top 85%' */
  start?: string;
  /** End trigger. Default 'top 20%' */
  end?: string;
}

/**
 * ScrollReveal — wraps children with GSAP ScrollTrigger animation.
 * Fades in + slides up when scrolling into view.
 * Reverses when scrolling back up (scrub mode).
 */
export default function ScrollReveal({
  children,
  className = '',
  yOffset = REVEAL_DEFAULTS.yOffset,
  xOffset = 0,
  duration = REVEAL_DEFAULTS.duration,
  delay = REVEAL_DEFAULTS.delay,
  scrub = false,
  start = REVEAL_DEFAULTS.start,
  end = REVEAL_DEFAULTS.end,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      gsap.set(el, { opacity: 1, x: 0, y: 0 });
      el.classList.add('revealed');
      return;
    }

    // Fix: content-visibility: auto makes the element 0×0 until near viewport,
    // breaking ScrollTrigger position calculations. Refresh when it gets dimensions.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { ScrollTrigger.refresh(); io.disconnect(); }
    }, { rootMargin: '400px' });
    io.observe(el);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: yOffset, x: xOffset },
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration,
          delay,
          ease: REVEAL_DEFAULTS.ease,
          onStart: () => {
            el.style.willChange = 'transform';
            el.classList.add('revealed');
          },
          onComplete: () => {
            el.style.willChange = 'auto';
          },
          scrollTrigger: scrub
            ? { trigger: el, start, end, scrub: REVEAL_DEFAULTS.scrubAmount }
            : { trigger: el, start, end, toggleActions: 'play none none none', once: true },
        }
      );
    }, el);

    return () => { ctx.revert(); io.disconnect(); };
  }, [yOffset, xOffset, duration, delay, scrub, start, end]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
