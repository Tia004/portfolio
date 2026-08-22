'use client';

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────

type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  duration?: number;
  durationOnHover?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
  overflowY?: 'hidden' | 'visible';
  /** Extra breathing room for BorderGlow halos around moving cards. */
  glowBleed?: number;
};

// ── InfiniteSlider ─────────────────────────────────────────────
//
//  Pure CSS approach: 2 copies rendered, @keyframes animation
//  translates by exactly calc(-50% - var(--gap)/2) = one copy + one gap.
//  Mathematically guaranteed seamless — no JS measurements needed.
//
//  Benefits over the old framer-motion approach:
//    1. Zero measurement jitter (no ResizeObserver, no useMeasure)
//    2. GPU-accelerated CSS transform (will-change: transform)
//    3. No JS overhead (no requestAnimationFrame loop)
//    4. Hover pauses via animation-play-state (no speed-transition bugs)
//    5. IntersectionObserver pauses entire animation when off-screen

const InfiniteSlider = memo(function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  durationOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
  overflowY = 'hidden',
  glowBleed = 28,
}: InfiniteSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Pause state lives in refs + direct DOM mutation, not React state: when a
  // slider crosses the viewport boundary (entering/leaving the skills section),
  // setPaused used to re-render the ENTIRE track — 4 copies of 12-16
  // TiltCard+BorderGlow cards, ×6 rows — during scroll. Now we flip
  // animationPlayState in place with zero re-renders.
  const pausedRef = useRef(false);
  const isHoveredRef = useRef(false);

  const applyPlayState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const pauseOnHover = durationOnHover !== undefined && isHoveredRef.current;
    track.style.animationPlayState = pausedRef.current || pauseOnHover ? 'paused' : 'running';
  }, [durationOnHover]);

  // Pause animation when slider is off-screen (saves CPU/GPU)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        pausedRef.current = !entry.isIntersecting;
        applyPlayState();
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [applyPlayState]);

  const isHorizontal = direction === 'horizontal';
  const animName = isHorizontal ? 'infscroll-h' : 'infscroll-v';
  // Visible marquees already let the glow paint outside the track. Padding is
  // only needed for clipped viewports (reviews), otherwise it would alter the
  // track's measured loop distance and create a seam.
  const effectiveGlowBleed = overflowY === 'hidden' ? glowBleed : 0;

  return (
    <div
      ref={containerRef}
      className={className ?? ''}
      style={{
        // Hover/tilt children need to paint outside the track vertically.
        // The page/section remains the horizontal boundary, so this does not
        // create a new horizontal scrollbar for marquee content.
        overflow: overflowY === 'visible' ? 'visible' : 'hidden',
        contain: overflowY === 'visible' ? 'none' : undefined,
        // Reserve a perimeter for BorderGlow's edge-light. The outer
        // marquee viewport may still clip its content at the intended edge,
        // but it no longer cuts the glow at the card's layout bounds.
        padding: effectiveGlowBleed > 0 ? `${effectiveGlowBleed}px` : undefined,
      }}
    >
      {/* Injected keyframes — one per direction so we don't pollute global scope */}
      <style>{`
        @keyframes infscroll-h {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-50% - var(--gap) / 2)); }
        }
        @keyframes infscroll-v {
          from { transform: translateY(0); }
          to   { transform: translateY(calc(-50% - var(--gap) / 2)); }
        }
      `}</style>

      <div
        ref={trackRef}
        className={`flex items-start ${isHorizontal ? 'w-max' : 'h-max flex-col'}`}
        style={{
          '--gap': `${gap}px`,
          gap: `${gap}px`,
          flexDirection: isHorizontal ? 'row' : 'column',
          animation: `${animName} ${duration}s linear infinite ${reverse ? 'reverse' : 'normal'}`,
          animationPlayState: 'running',
          // Horizontal sliders (skills, FAQ) rely on the browser to promote
          // the animated track to a GPU layer naturally. Only vertical sliders
          // (reviews) need an explicit hint — their translateY animation is
          // more prone to tearing without a pre-allocated compositor layer.
          willChange: isHorizontal ? 'auto' : 'transform',
        } as React.CSSProperties}
        onMouseEnter={() => { isHoveredRef.current = true; applyPlayState(); }}
        onMouseLeave={() => { isHoveredRef.current = false; applyPlayState(); }}
      >
        {children}
        {children}
      </div>
    </div>
  );
});

export default InfiniteSlider;
