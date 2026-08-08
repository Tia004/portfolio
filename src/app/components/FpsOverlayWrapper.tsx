'use client';

import dynamic from 'next/dynamic';

const FpsOverlay = dynamic(() => import('./FpsOverlay'), { ssr: false });

/**
 * Thin client-component wrapper — required because Next.js 16 disallows
 * `ssr: false` with `next/dynamic` in Server Components. This file
 * is a Client Component, so the dynamic import is legal here.
 */
export default function FpsOverlayWrapper() {
  return <FpsOverlay />;
}
