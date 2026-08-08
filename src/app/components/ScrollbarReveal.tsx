'use client';

import { useEffect, useRef } from 'react';

/**
 * Shows the page scrollbar (subtle 10% by default) at full teal when
 * the mouse approaches the right edge. Threshold is 5vw so on a 1920px
 * screen the scrollbar intensifies ~96px from the edge.
 *
 * Toggles `scrollbar-visible` on `<body>` — the actual scrolling
 * element, where WebKit scrollbar pseudo-elements live.
 */
export default function ScrollbarReveal() {
  const visibleRef = useRef(false);

  useEffect(() => {
    const body = document.body;

    const onMove = (e: MouseEvent) => {
      const threshold = window.innerWidth * 0.05;
      const distFromRight = window.innerWidth - e.clientX;
      const shouldShow = distFromRight <= threshold;

      if (shouldShow && !visibleRef.current) {
        visibleRef.current = true;
        body.classList.add('scrollbar-visible');
      } else if (!shouldShow && visibleRef.current) {
        visibleRef.current = false;
        body.classList.remove('scrollbar-visible');
      }
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  return null;
}
