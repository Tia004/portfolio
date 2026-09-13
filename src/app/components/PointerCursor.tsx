'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Canvas effect — load it lazily so its eval never blocks the first paint
// (it only ever renders on fine-pointer devices anyway).
const PixelTrail = dynamic(() => import('./PixelTrail'), {
  ssr: false,
  loading: () => null,
});

// ── Cursor trail: currently DISABLED ──────────────────────────────────────
// This layer is a full-viewport canvas at z-index 99999, so ANYTHING it paints
// is painted over the whole site. It uses @react-three/drei's trail texture,
// which is a 2D canvas uploaded as a GL texture; on some drivers (Windows/
// ANGLE, software rasterisers) that texture is sampled as fully white, so the
// fragment shader paints ONE flat colour across the entire viewport — the
// "green halo over the whole site" reported on Windows, with the macOS/Metal
// path unaffected. It was measured here: with the layer visible the hero
// averages 172/255 luminance with 99% green pixels, and hiding the layer drops
// it to 50/255 with 12% green (the intended dark dither).
//
// The shader now also fails safe (no draw if `resolution` is not finite) and
// only paints after a real pointer event, but the white-texture failure cannot
// be caught from the fragment shader, so until the effect is rebuilt on a
// render target we clear ourselves, the safe choice is to not show it at all.
// Flip this to true after that rebuild.
const CURSOR_TRAIL_ENABLED = false;

export default function PointerCursor() {
  const pathname = usePathname();
  const [hasFinePointer, setHasFinePointer] = useState(false);
  const isMasterPortal = pathname === '/loginmaster' || pathname?.startsWith('/loginmaster/') === true;

  useEffect(() => {
    // The master portal is an isolated admin surface: the global PixelTrail
    // must never cover its passkey UI or intercept its visual layer.
    if (isMasterPortal) {
      document.documentElement.classList.remove('custom-cursor-active');
      return;
    }

    // Check for fine pointer (mouse, stylus, S Pen, trackpad — NOT touch-only)
    const mql = window.matchMedia('(pointer: fine)');
    const update = (matches: boolean) => {
      setHasFinePointer(matches);
      // NOTE: `custom-cursor-active` hides the NATIVE cursor, so it must only
      // be applied when the replacement cursor is actually rendered.
      document.documentElement.classList.toggle(
        'custom-cursor-active',
        matches && CURSOR_TRAIL_ENABLED
      );
    };
    update(mql.matches);

    const handler = (e: MediaQueryListEvent) => update(e.matches);
    mql.addEventListener('change', handler);
    return () => {
      mql.removeEventListener('change', handler);
      document.documentElement.classList.remove('custom-cursor-active');
    };
  }, [isMasterPortal]);

  if (!CURSOR_TRAIL_ENABLED || isMasterPortal || !hasFinePointer) return null;

  return (
    <PixelTrail
      gridSize={160}
      trailSize={0.05}
      maxAge={350}
      interpolate={1.8}
      color="#2dd4bf"
    />
  );
}
