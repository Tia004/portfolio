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
        }
      },
      { rootMargin: `${rootMargin}px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
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
