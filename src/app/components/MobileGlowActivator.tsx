'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * On touch devices (no hover capability), watches all .border-glow-card
 * elements and auto-activates the glow on the most prominent card in the
 * viewport. The glow stays active until the user scrolls to another card.
 *
 * Desktop with hover: no effect (rely on mouse events).
 */
export default function MobileGlowActivator({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Only activate on devices without fine pointer (no hover)
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches;
    if (!isTouch) return;

    let activeEl: HTMLElement | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the card with the highest intersection ratio
        let best: { el: HTMLElement; ratio: number } | null = null;
        for (const entry of entries) {
          if (entry.intersectionRatio > (best?.ratio ?? 0)) {
            best = { el: entry.target as HTMLElement, ratio: entry.intersectionRatio };
          }
        }

        if (best && best.el !== activeEl && best.ratio > 0.3) {
          // Deactivate previous
          if (activeEl) {
            activeEl.style.setProperty('--edge-proximity', '0');
            activeEl.classList.remove('scroll-glow-active');
          }
          // Activate new
          best.el.style.setProperty('--edge-proximity', '100');
          best.el.classList.add('scroll-glow-active');
          activeEl = best.el;
        }
      },
      { threshold: [0, 0.3, 0.5, 0.7, 1] }
    );

    // Cards are server-rendered — observe once on mount
    document.querySelectorAll('.border-glow-card').forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (activeEl) {
        activeEl.style.setProperty('--edge-proximity', '0');
        activeEl.classList.remove('scroll-glow-active');
      }
    };
  }, []);

  return <>{children}</>;
}
