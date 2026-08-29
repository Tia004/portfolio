'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { loadGsap } from '@/lib/gsap-lazy';
import { STAGGER_DEFAULTS } from '@/lib/animation-theme';

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  /** Vertical offset in px. Default 36 */
  yOffset?: number;
  /** Duration per child. Default 0.7 */
  duration?: number;
  /** Stagger delay between children in seconds. Default 0.08 */
  stagger?: number;
  /** When the animation starts (ScrollTrigger start). Default 'top 88%' */
  start?: string;
  /** When the animation ends. Default 'bottom 12%' */
  end?: string;
  /** Easing. Default 'power3.out' */
  ease?: string;
}

/**
 * StaggerReveal — wraps children and uses GSAP ScrollTrigger to
 * stagger-entrance (fade + slide up) each direct child.
 * Animations REVERSE when the container leaves the viewport so
 * scrolling back up re-hides elements for a fresh reveal on re-entry.
 */
export default function StaggerReveal({
  children,
  className = '',
  yOffset = STAGGER_DEFAULTS.yOffset,
  duration = STAGGER_DEFAULTS.duration,
  stagger = STAGGER_DEFAULTS.stagger,
  start = STAGGER_DEFAULTS.start,
  end = STAGGER_DEFAULTS.end,
  ease = STAGGER_DEFAULTS.ease,
}: StaggerRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const targets = el.children;
    if (targets.length === 0) return;

    let alive = true;
    loadGsap().then((gsap) => {
      if (!alive) return;
      const ctx = gsap.context(() => {
        const targetArray = Array.from(targets) as HTMLElement[];
        gsap.fromTo(
          targets,
          { opacity: 0, y: yOffset },
          {
            opacity: 1,
            y: 0,
            duration,
            stagger,
            ease,
            onStart: () => {
              targetArray.forEach((t) => { t.style.willChange = 'transform'; });
            },
            onComplete: () => {
              targetArray.forEach((t) => { t.style.willChange = 'auto'; });
            },
            scrollTrigger: {
              trigger: el,
              start,
              end,
              toggleActions: 'play none none none',
              once: true,
            },
          }
        );
      }, el);
      ctxRef.current = ctx;
    });

    return () => { alive = false; ctxRef.current?.revert(); };
  }, [yOffset, duration, stagger, start, end, ease]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
