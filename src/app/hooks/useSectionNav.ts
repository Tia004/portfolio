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

  // ── Track active section from container scroll position ──
  // An IntersectionObserver with a shrunken rootMargin is unreliable at the
  // bottom of a scroll container: the last (often short) sections fall below
  // the shrunken root and never intersect, so the active dot stops a few
  // sections early — the bug reported for the legal modals. Computing from
  // scrollTop always resolves: the active section is the last one whose top
  // crossed the active line (the top inset from rootMargin), and at max
  // scroll it is clamped to the last section.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Top inset parsed from rootMargin (e.g. "-80px 0px -40% 0px" → 80).
    // A section becomes active when its top crosses that many px below the
    // container's top edge.
    const topInset = -parseFloat((rootMargin.split(/\s+/)[0] || '0').replace(/[^-\d.]/g, '') || '0') || 0;

    const computeActive = () => {
      const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
      if (!sections.length) return;

      const line = el.scrollTop + topInset;
      let active = 0;
      for (let i = 0; i < sections.length; i++) {
        const top = scrollParentIsOffsetParent
          ? sections[i].offsetTop
          : sections[i].offsetTop - el.offsetTop;
        if (top <= line) active = i;
        else break;
      }

      // At the very bottom, the last section is the active one regardless of
      // how short it is.
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
        active = sections.length - 1;
      }

      setActiveSection(active);
    };

    computeActive();
    el.addEventListener('scroll', computeActive, { passive: true });
    window.addEventListener('resize', computeActive);
    return () => {
      el.removeEventListener('scroll', computeActive);
      window.removeEventListener('resize', computeActive);
    };
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
