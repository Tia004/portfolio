'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TooltipContentProps {
  text: string;
  el: HTMLElement;
  hiding?: boolean;
}

/**
 * TooltipContent — renders a fixed-position tooltip bubble that follows
 * its trigger element on scroll/resize, with fade-in/out transitions.
 */
export default function TooltipContent({ text, el, hiding }: TooltipContentProps) {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const posRef = useRef({ x: 0, y: 0 });

  // Coalesced scroll update: instead of reading the rect and calling setState
  // on every scroll event (a forced layout + re-render per frame), the work is
  // batched into one rAF, and setState is skipped when the position is
  // unchanged. Keeps tooltips anchored without contributing scroll jank.
  const update = useCallback(() => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    if (posRef.current.x !== x || posRef.current.y !== y) {
      posRef.current = { x, y };
      setPos({ x, y });
    }
  }, [el]);

  // Fade in on mount / fade out when hiding
  useEffect(() => {
    if (hiding) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [hiding]);

  // Track scroll and resize to keep anchored to the trigger element
  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [update]);

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y - 8,
        transform: 'translate(-50%, -100%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.1s ease-out',
      }}
      className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-xs text-neutral-300 leading-relaxed w-44 sm:w-56 shadow-xl shadow-black/50 z-[9999] pointer-events-none"
    >
      {text}
      <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[#1a1a1a] border-r border-b border-white/10 rotate-45" />
    </div>
  );
}
