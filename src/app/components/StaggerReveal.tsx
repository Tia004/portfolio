'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STAGGER_DEFAULTS } from '@/lib/animation-theme';
import { refreshScrollTriggers } from '@/lib/scroll';

gsap.registerPlugin(ScrollTrigger);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Fix: content-visibility: auto makes children 0×0 until near viewport,
    // breaking ScrollTrigger position calculations. Refresh when visible — via
    // refreshScrollTriggers() which skips refresh during an active scroll
    // gesture (a mid-gesture refresh fights Lenis → jitter).
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { refreshScrollTriggers(); io.disconnect(); }
    }, { rootMargin: '400px' });
    io.observe(el);

    const targets = el.children;
    if (targets.length === 0) return;

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

    return () => { ctx.revert(); io.disconnect(); };
  }, [yOffset, duration, stagger, start, end, ease]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
