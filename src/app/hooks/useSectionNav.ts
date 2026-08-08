'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface UseSectionNavOptions {
  /** IntersectionObserver rootMargin — e.g. '-60px 0px -30% 0px' */
  rootMargin?: string;
  /** IntersectionObserver thresholds — default [0, 0.25, 0.5, 0.75, 1] */
  threshold?: number[];
  /** Dependencies that should re-create the observer (the section data) */
  deps?: unknown[];
  /** Scroll offset (px) subtracted from calculated top position — default 0 */
  scrollOffset?: number;
  /**
   * When true, `el.offsetTop` already measures from the scroll container
   * (because the container has `position: relative`, making it the offsetParent).
   * When false (default), `el.offsetTop - container.offsetTop` is used.
   */
  scrollParentIsOffsetParent?: boolean;
}

export function useSectionNav(options: UseSectionNavOptions = {}) {
  const {
    rootMargin = '0px 0px 0px 0px',
    threshold = [0, 0.25, 0.5, 0.75, 1],
    deps = [],
    scrollOffset = 0,
    scrollParentIsOffsetParent = false,
  } = options;

  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeSection, setActiveSection] = useState(0);

  /** Ref callback to register a section element at the given index */
  const registerSection = useCallback(
    (index: number) =>
      (el: HTMLElement | null) => {
        sectionRefs.current[index] = el;
      },
    [],
  );

  // ── IntersectionObserver: track active section ──
  useEffect(() => {
    const els = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      const rootTop = entries[0]?.rootBounds?.top ?? 0;
      let best: number | null = null;
      let bestDist = Infinity;

      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const idx = Number(el.dataset.section);
          if (!isNaN(idx)) {
            const dist = Math.abs(entry.boundingClientRect.top - rootTop);
            if (dist < bestDist) {
              bestDist = dist;
              best = idx;
            }
          }
        }
      }

      if (best !== null) setActiveSection(best);
    };

    const observer = new IntersectionObserver(handleIntersect, {
      root: contentRef.current,
      rootMargin,
      threshold,
    });

    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // ── Scroll to section on click ──
  const scrollToSection = useCallback(
    (index: number) => {
      const el = sectionRefs.current[index];
      if (!el || !contentRef.current) return;
      setActiveSection(index);

      const top = scrollParentIsOffsetParent
        ? el.offsetTop - scrollOffset
        : el.offsetTop - contentRef.current.offsetTop - scrollOffset;

      contentRef.current.scrollTo({ top, behavior: 'smooth' });
    },
    [scrollOffset, scrollParentIsOffsetParent],
  );

  return {
    /** Ref to pass on the scrollable container (overflow-y-auto div) */
    contentRef,
    /**
     * Call to get a ref callback for a section element at the given index.
     * The element MUST have a `data-section={index}` attribute for the observer.
     *
     * @example
     * <div ref={registerSection(0)} data-section={0}>...</div>
     */
    registerSection,
    /** Index of the currently visible / closest section */
    activeSection,
    /** Manually set the active section (e.g. reset on data change) */
    setActiveSection,
    /** Smooth-scroll the container to bring a section into view */
    scrollToSection,
  };
}
