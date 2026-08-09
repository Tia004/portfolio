'use client';

import { useEffect, useState } from 'react';
import Dither from './Dither';

// SVG turbulence noise — the classic "dither grain" texture. Data-URI so it
// renders from the very first paint with zero network or WebGL dependency.
const NOISE_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")`;

interface HeroDitherProps {
  waveColor?: [number, number, number];
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  colorNum?: number;
  pixelSize?: number;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
}

export default function HeroDither(props: HeroDitherProps) {
  // Animated WebGL dither only on hover-capable devices (desktop / mouse).
  // Touch devices get the static CSS dither: guaranteed render, no WebGL
  // context, no GPU cost — the hero always looks finished on mobile.
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      {/* Static dither base — always visible, instant, GPU-cheap */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: '#010101' }}
      />
      {/* Teal glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 90% 65% at 50% 38%, rgba(45,212,191,0.16), transparent 72%)',
        }}
      />
      {/* Dither grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: NOISE_URI,
          opacity: 0.45,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Animated WebGL waves — desktop only */}
      {desktop && <Dither {...props} />}
    </>
  );
}
