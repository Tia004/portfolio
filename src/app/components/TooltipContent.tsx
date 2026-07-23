'use client';

import React, { useState, useEffect, useCallback } from 'react';

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

  const update = useCallback(() => {
    const rect = el.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
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
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
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
