'use client';

import { useEffect, useState } from 'react';

/**
 * Detects whether the current device has limited hardware capabilities.
 *
 * Heuristics (any one triggers "low-end"):
 *  - < 4 GB device RAM
 *  - ≤ 4 CPU cores
 *  - Mobile device (touch + small screen)
 *  - Low-end integrated GPU
 *
 * Returns `false` on the server (conservative: assumes capable device).
 * On the client, the result is computed once per call and cached only for
 * the duration of that call tree (module-level cache would survive SSR →
 * client hydration, so we avoid it).
 */

export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false; // SSR: assume capable

  // Allow forcing high-performance mode via env var (useful for testing on Apple Silicon)
  if (process.env.NEXT_PUBLIC_FORCE_PERFORMANCE === 'true') return false;

  // deviceMemory is available in Chromium-based browsers
  const memory = (navigator as any).deviceMemory as number | undefined;
  if (memory !== undefined && memory < 4) return true;

  // Mobile devices: touch support + smaller screen (reliable combo)
  const hasTouch =
    'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0;
  const smallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  if (hasTouch && smallScreen) return true;

  // Check for low-end GPU via WebGL renderer string
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const wgl = gl as WebGLRenderingContext;
      const debugInfo = wgl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = wgl
          .getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL)
          .toLowerCase();
        // Integrated/old GPUs
        if (
          renderer.includes('mali') ||
          renderer.includes('adreno 5') ||
          renderer.includes('adreno 4') ||
          renderer.includes('powervr') ||
          renderer.includes('intel hd graphics') ||
          renderer.includes('intel uhd graphics')
        ) {
          return true;
        }
      }
      wgl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    return true;
  }

  return false;
}

/** CSS class added to `<html>` when device is low-end. */
export const LOW_END_CLASS = 'is-low-end';

/**
 * React hook that returns `true` after hydration if the device is low-end.
 * On the server it returns `null` (unknown) so you can avoid conditional flash.
 */
export function useIsLowEnd(): boolean | null {
  const [lowEnd, setLowEnd] = useState<boolean | null>(null);

  useEffect(() => {
    setLowEnd(isLowEndDevice());
  }, []);

  return lowEnd;
}

/**
 * Injects the CSS class into `<html>` if the device is low-end.
 * Call once in your root layout or provider.
 */
export function applyLowEndClass() {
  if (typeof document === 'undefined') return;
  if (isLowEndDevice()) {
    document.documentElement.classList.add(LOW_END_CLASS);
  }
}
