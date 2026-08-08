'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getCallbackCount, getFPS, scheduleTick, unscheduleTick, enableTickerDebug, disableTickerDebug } from '@/lib/useSharedTicker';

/**
 * Dev-only performance overlay — activated via `?fps=1` in the URL.
 * Shows real-time FPS and active shared-ticker callback count.
 *
 * Registers a lightweight no-op callback in the shared ticker on mount so the
 * rAF loop stays alive for FPS measurement. Unregisters on unmount so the
 * loop auto-stops for regular users who never use ?fps=1.
 */
export default function FpsOverlay() {
  const [fps, setFps] = useState(0);
  const [cbCount, setCbCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const lastPollRef = useRef(0);

  // Only render when ?fps=1 is in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fps') === '1') {
      setVisible(true);
    }
  }, []);

  // Stable no-op callback: keeps the shared rAF loop alive so FPS is measured,
  // and throttles React state updates to ~4 Hz to avoid re-render churn.
  const tick = useCallback(() => {
    const now = performance.now();
    if (now - lastPollRef.current < 250) return;
    lastPollRef.current = now;
    setFps(getFPS());
    setCbCount(getCallbackCount());
  }, []);

  // Keep the shared ticker alive only while this overlay is visible.
  useEffect(() => {
    if (!visible) return;
    enableTickerDebug();
    scheduleTick(tick, 'FpsOverlay');
    return () => {
      unscheduleTick(tick);
      disableTickerDebug();
    };
  }, [visible, tick]);

  if (!visible) return null;

  // Color-code FPS: green ≥55, yellow ≥30, red <30
  const fpsColor =
    fps >= 55 ? '#22c55e' :
    fps >= 30 ? '#eab308' :
                '#ef4444';

  const cbColor =
    cbCount <= 3  ? '#22c55e' :
    cbCount <= 8  ? '#eab308' :
                    '#ef4444';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-3 top-3 z-[99999] select-none font-mono text-[11px] leading-tight"
    >
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/70 px-3 py-2 backdrop-blur-md">
        {/* FPS */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-[7px] w-[7px] rounded-full"
            style={{ backgroundColor: fpsColor }}
          />
          <span className="text-white/90">
            <span style={{ color: fpsColor }}>{fps}</span>
            <span className="text-white/40"> fps</span>
          </span>
        </div>

        {/* Separator */}
        <div className="h-3.5 w-px bg-white/[0.10]" />

        {/* Callback count */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-[7px] w-[7px] rounded-full"
            style={{ backgroundColor: cbColor }}
          />
          <span className="text-white/90">
            <span style={{ color: cbColor }}>{cbCount}</span>
            <span className="text-white/40"> jobs</span>
          </span>
        </div>
      </div>
    </div>
  );
}
