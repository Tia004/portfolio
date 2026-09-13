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

// ── Cursor trail ──────────────────────────────────────────────────────────
// This layer is a full-viewport canvas at z-index 99999, so ANYTHING it paints
// is painted over the whole site. The "green halo over the entire site" seen on
// some Windows machines came from its trail texture: @react-three/drei stamps
// the trail into a 2D canvas and uploads that as a GL texture, and on drivers
// that mis-sample a canvas-backed texture every texel reads as 1.0, so the
// shader painted ONE flat teal colour over the whole viewport.
//
// PixelTrail now owns the trail field itself as a Uint8Array (see TrailBuffer
// there): the buffer starts provably all-zero, no canvas and no driver-managed
// fallback texture is involved, the material stays transparent until a real
// pointer event arrives (`uArmed`), and the decay is driven by frames so the
// trail always fades out instead of freezing in its last shape.
//
// Kill switch: set to false to remove the effect entirely.
const CURSOR_TRAIL_ENABLED = true;

export default function PointerCursor() {
  const pathname = usePathname();
  const [hasFinePointer, setHasFinePointer] = useState(false);
  // The native cursor is hidden ONLY once the trail canvas has actually drawn
  // a frame AND the layer is armed (first real pointer movement). If WebGL is
  // unavailable or blocked, the class is never added and the visitor keeps a
  // normal pointer.
  const [trailReady, setTrailReady] = useState(false);
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
    const update = (matches: boolean) => setHasFinePointer(matches);
    update(mql.matches);

    const handler = (e: MediaQueryListEvent) => update(e.matches);
    mql.addEventListener('change', handler);
    // The layer is decorative: it must never be the only pointer on screen.
    document.documentElement.classList.remove('custom-cursor-active');
    return () => {
      mql.removeEventListener('change', handler);
      document.documentElement.classList.remove('custom-cursor-active');
    };
  }, [isMasterPortal]);

  // `custom-cursor-active` hides the NATIVE cursor, so it is applied only when
  // the replacement is demonstrably drawing: `trailReady` is raised by
  // PixelTrail after the layer is armed AND has rendered a real frame.
  useEffect(() => {
    const replaceCursor = CURSOR_TRAIL_ENABLED && !isMasterPortal && hasFinePointer && trailReady;
    document.documentElement.classList.toggle('custom-cursor-active', replaceCursor);
  }, [isMasterPortal, hasFinePointer, trailReady]);

  if (!CURSOR_TRAIL_ENABLED || isMasterPortal || !hasFinePointer) return null;

  return (
    <PixelTrail
      gridSize={160}
      trailSize={0.05}
      maxAge={350}
      interpolate={1.8}
      color="#2dd4bf"
      onReady={() => setTrailReady(true)}
    />
  );
}
