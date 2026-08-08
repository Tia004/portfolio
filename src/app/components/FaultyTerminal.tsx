'use client';

import React, { useRef, useEffect, useState } from 'react';

export interface FaultyTerminalProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Overall scale multiplier for the dot grid size (default 1) */
  scale?: number;
  /** Dot grid multiplier [x, y] (default [2, 1]) */
  gridMul?: [number, number];
  /** Not used in CSS version — kept for API compatibility */
  digitSize?: number;
  /** Animation speed multiplier (default 0.3) */
  timeScale?: number;
  /** Pause animation (default false) */
  pause?: boolean;
  /** Opacity of the animated dots (0–1, default 0.4) */
  scanlineIntensity?: number;
  /** Not used — kept for compatibility */
  glitchAmount?: number;
  /** Not used — kept for compatibility */
  flickerAmount?: number;
  /** Not used — kept for compatibility */
  noiseAmp?: number;
  /** Not used — kept for compatibility */
  chromaticAberration?: number;
  /** Not used — kept for compatibility */
  dither?: number | boolean;
  /** Not used — kept for compatibility */
  curvature?: number;
  /** Tint color for the dots (default '#10B981' = teal) */
  tint?: string;
  /** Not used — kept for compatibility */
  mouseReact?: boolean;
  /** Not used — kept for compatibility */
  mouseStrength?: number;
  /** Not used — kept for compatibility */
  pageLoadAnimation?: boolean;
  /** Overall brightness/opacity of the pattern (0–1, default 0.3) */
  brightness?: number;
  onLoadComplete?: () => void;
}

export default function FaultyTerminal({
  scale = 1,
  gridMul = [2, 1],
  digitSize,
  timeScale = 0.3,
  pause = false,
  scanlineIntensity = 0.4,
  glitchAmount,
  flickerAmount,
  noiseAmp,
  chromaticAberration,
  dither,
  curvature,
  tint = '#10B981',
  mouseReact,
  mouseStrength,
  pageLoadAnimation,
  brightness = 0.3,
  onLoadComplete,
  className = '',
  style,
  ...rest
}: FaultyTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const loadedRef = useRef(false);

  // Track visibility to only animate when in view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        if (!loadedRef.current) {
          loadedRef.current = true;
          onLoadComplete?.();
        }
      }
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadComplete]);

  const dotSize = Math.max(1.5, 2 * scale);
  const gridGap = Math.max(10, 20 * scale * (gridMul[0] / 2));
  const animDuration = pause ? 99999 : Math.max(8, 20 / (timeScale || 1));

  return (
    <div
      ref={containerRef}
      className={`${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'transparent',
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: visible ? (brightness ?? 0.3) : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: 'none',
        }}
      >
        {/* Base dot layer — static dots */}
        <div
          className="faulty-terminal-dots"
          style={{
            position: 'absolute',
            inset: 0,
            background: tint,
            maskImage: `radial-gradient(circle at 50% 50%, white ${dotSize}px, transparent ${dotSize + 0.5}px)`,
            maskPosition: '50% 50%',
            maskSize: `${gridGap}px ${gridGap}px`,
            maskRepeat: 'repeat',
            WebkitMaskImage: `radial-gradient(circle at 50% 50%, white ${dotSize}px, transparent ${dotSize + 0.5}px)`,
            WebkitMaskPosition: '50% 50%',
            WebkitMaskSize: `${gridGap}px ${gridGap}px`,
            WebkitMaskRepeat: 'repeat',
          }}
        />

        {/* Animated noise layer — creates subtle flicker/movement */}
        <div
          className="faulty-terminal-noise"
          style={{
            position: 'absolute',
            inset: 0,
            background: tint,
            maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)'/%3E%3C/svg%3E")`,
            maskPosition: '256px 50%',
            maskSize: '256px 256px',
            maskRepeat: 'repeat',
            WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)'/%3E%3C/svg%3E")`,
            WebkitMaskPosition: '256px 50%',
            WebkitMaskSize: '256px 256px',
            WebkitMaskRepeat: 'repeat',
            animation: pause ? 'none' : `faulty-terminal-drift ${animDuration}s infinite linear`,
          }}
        />
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes faulty-terminal-drift {
          to { mask-position: 0 50%; }
        }
      `}</style>
    </div>
  );
}
