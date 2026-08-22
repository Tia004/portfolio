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
      document.documentElement.classList.toggle('custom-cursor-active', matches);
    };
    update(mql.matches);

    const handler = (e: MediaQueryListEvent) => update(e.matches);
    mql.addEventListener('change', handler);
    return () => {
      mql.removeEventListener('change', handler);
      document.documentElement.classList.remove('custom-cursor-active');
    };
  }, [isMasterPortal]);

  if (isMasterPortal || !hasFinePointer) return null;

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
