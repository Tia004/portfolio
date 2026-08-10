'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** Distance in px from viewport before rendering (default 300) */
  rootMargin?: number;
  /** Placeholder height to prevent layout shift */
  placeholderHeight?: number;
  className?: string;
}

/**
 * Only renders children when the element is within `rootMargin` px of the viewport.
 * When off-screen, renders a spacer div with the same height to prevent layout shift.
 * Dramatically reduces the number of mounted canvas / rAF / event-listener components.
 */
export default function LazySection({
  children,
  rootMargin = 300,
  placeholderHeight,
  className = '',
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          renderedRef.current = true;
          // Once rendered, stop observing — keep it mounted
          observer.disconnect();
          // The placeholder → real-content swap changes the document height.
          // HomeShell listens for this and calls lenis.resize() right away so
          // Lenis' scroll limit never goes stale mid-gesture (stale limit =
          // scroll that stops and restarts while scrolling past the section).
          window.dispatchEvent(new Event('tia:section-mounted'));
        }
      },
      { rootMargin: `${rootMargin}px` },
    );
    observer.observe(el);
    // Force-mount on demand: navigation (burger menu, footer links, CTA) may
    // target a section that is still inside this lazy wrapper. The global
    // 'tia:force-mount' event mounts every lazy section so the anchor exists
    // in the DOM before the smooth scroll runs.
    const forceMount = () => {
      if (!renderedRef.current) {
        renderedRef.current = true;
        setIsVisible(true);
        observer.disconnect();
      }
    };
    window.addEventListener('tia:force-mount', forceMount);
    return () => {
      observer.disconnect();
      window.removeEventListener('tia:force-mount', forceMount);
    };
  }, [rootMargin]);

  // Measure height once before rendering to use as placeholder
  useEffect(() => {
    if (!isVisible && !measuredHeight && ref.current) {
      // Use a quick measurement of the parent's expected height
      const rect = ref.current.getBoundingClientRect();
      if (rect.height > 0) setMeasuredHeight(rect.height);
    }
  }, [isVisible, measuredHeight]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        children
      ) : (
        <div
          style={{ height: placeholderHeight || measuredHeight || 'auto', minHeight: '100px' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
