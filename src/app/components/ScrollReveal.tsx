'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** How far the element slides up from, in px. Default 40 */
  yOffset?: number;
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
  yOffset = 40,
  duration = 0.8,
  delay = 0,
  scrub = false,
  start = 'top 85%',
  end = 'top 20%',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: yOffset },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: scrub
            ? { trigger: el, start, end, scrub: 0.3 }
            : { trigger: el, start, end, toggleActions: 'play reverse play reverse' },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [yOffset, duration, delay, scrub, start, end]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
