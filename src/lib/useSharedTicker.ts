'use client';

/**
 * Shared rAF ticker — module-level singleton.
 *
 * Instead of each component (PixelTrail, BorderGlow, TiltCard) spinning its own
 * requestAnimationFrame loop, they register callbacks here. The ticker runs ONE
 * rAF per frame, dispatches to all registered callbacks, and auto-stops when
 * no callbacks are registered.
 *
 * Usage:
 *   import { scheduleTick, unscheduleTick } from '@/lib/useSharedTicker';
 *
 *   const tick = () => { /* your frame work *‍/ };
 *   scheduleTick(tick, 'MyComponent');   // start (name is optional)
 *   unscheduleTick(tick);                // stop
 *
 * Callbacks MUST have stable identity — use `useCallback(() => { ... }, [])`.
 * For work that depends on changing state, store the latest values in a ref
 * and read it inside the stable callback.
 *
 * Debug mode — activate via `enableTickerDebug()`. Logs per-component CPU
 * timing every 2 seconds as a console.table, plus performance.mark/measure
 * for each callback dispatch under the 'ticker' group.
 */

type TickCallback = () => void;

// ── Callback registry (named) ──
const cbNames = new Map<TickCallback, string>();
let nextAnonId = 1;

function resolveName(cb: TickCallback): string {
  if (cbNames.has(cb)) return cbNames.get(cb)!;
  const name = `anon_${nextAnonId++}`;
  cbNames.set(cb, name);
  return name;
}

// ── Loop state ──
const callbacks = new Set<TickCallback>();
let rafId = 0;
let pageHidden = false;

// ── FPS tracking ──
const FPS_SAMPLE_WINDOW = 60;
const frameTimestamps: number[] = [];
let currentFps = 0;

// ── Per-component timing (only when debug is enabled) ──
type TimingBucket = { totalMs: number; frames: number; peakMs: number };
const timings = new Map<string, TimingBucket>();
let debugEnabled = false;
let debugLogFrames = 0;
const DEBUG_LOG_INTERVAL = 120; // ~2s at 60fps

function tick() {
  rafId = 0;

  if (pageHidden) {
    currentFps = 0;
    return;
  }

  const now = performance.now();
  frameTimestamps.push(now);
  while (frameTimestamps.length > 1 && frameTimestamps[0] < now - 1000) {
    frameTimestamps.shift();
  }
  if (frameTimestamps.length > FPS_SAMPLE_WINDOW) {
    frameTimestamps.shift();
  }
  if (frameTimestamps.length >= 2) {
    const elapsed = frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0];
    currentFps = elapsed > 0 ? Math.round(((frameTimestamps.length - 1) / elapsed) * 1000) : 0;
  }

  if (callbacks.size === 0) {
    currentFps = 0;
    return;
  }

  rafId = requestAnimationFrame(tick);

  // ── Debug: create a mark group for this frame ──
  if (debugEnabled) {
    debugLogFrames++;
  }

  const cbs = Array.from(callbacks);
  for (let i = 0; i < cbs.length; i++) {
    const cb = cbs[i];
    if (!callbacks.has(cb)) continue; // removed mid-frame by an earlier callback

    if (debugEnabled) {
      const markStart = `tick:${resolveName(cb)}:start`;
      const markEnd = `tick:${resolveName(cb)}:end`;
      performance.mark(markStart);
      cb();
      performance.mark(markEnd);
      try {
        performance.measure(`tick:${resolveName(cb)}`, markStart, markEnd);
      } catch {
        // Duplicate mark name — ignore (happens if callback is re-entrant).
      }
      // Accumulate timing for periodic log
      const bucket = timings.get(resolveName(cb)) ?? { totalMs: 0, frames: 0, peakMs: 0 };
      const entries = performance.getEntriesByName(`tick:${resolveName(cb)}`, 'measure');
      const duration = entries.length > 0 ? entries[entries.length - 1].duration : 0;
      bucket.totalMs += duration;
      bucket.frames++;
      if (duration > bucket.peakMs) bucket.peakMs = duration;
      timings.set(resolveName(cb), bucket);
    } else {
      cb();
    }
  }

  // ── Debug: periodic console.table ──
  if (debugEnabled && debugLogFrames >= DEBUG_LOG_INTERVAL) {
    debugLogFrames = 0;
    if (timings.size > 0) {
      const rows: Record<string, { avg_ms: string; peak_ms: string; frames: number }> = {};
      for (const [name, bucket] of timings) {
        rows[name] = {
          avg_ms: (bucket.totalMs / bucket.frames).toFixed(3),
          peak_ms: bucket.peakMs.toFixed(3),
          frames: bucket.frames,
        };
      }
      console.groupCollapsed(
        `%c⚡ Ticker %c${DEBUG_LOG_INTERVAL} frames %c(avg FPS: ${currentFps})`,
        'color:#10b981',
        'color:#94a3b8',
        'color:#64748b'
      );
      console.table(rows);
      console.groupEnd();
      // Clear accumulated measurements
      performance.clearMarks();
      performance.clearMeasures();
    }
    timings.clear();
  }
}

// ── Page Visibility ──

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    pageHidden = document.hidden;
    if (!pageHidden && callbacks.size > 0 && !rafId) {
      frameTimestamps.length = 0;
      rafId = requestAnimationFrame(tick);
    }
  });
}

/** Register a frame callback with an optional human-readable name.
 *  Safe to call multiple times with the same fn (deduped by identity). */
export function scheduleTick(cb: TickCallback, name?: string): void {
  if (name) cbNames.set(cb, name);
  callbacks.add(cb);
  if (!rafId) rafId = requestAnimationFrame(tick);
}

/** Unregister a frame callback. */
export function unscheduleTick(cb: TickCallback): void {
  callbacks.delete(cb);
}

/** Number of callbacks currently registered. */
export function getCallbackCount(): number {
  return callbacks.size;
}

/** Real-time FPS measured over the last ~1 second. */
export function getFPS(): number {
  return currentFps;
}

// ── Debug API ──

/** Enable per-component CPU timing with performance.mark/measure and
 *  periodic console.table logs. Called automatically by FpsOverlay when
 *  ?fps=1 is active. */
export function enableTickerDebug(): void {
  debugEnabled = true;
  debugLogFrames = 0;
  timings.clear();
}

/** Disable per-component timing and stop console logging. */
export function disableTickerDebug(): void {
  debugEnabled = false;
  timings.clear();
  performance.clearMarks();
  performance.clearMeasures();
}

/** Whether debug mode is currently active. */
export function isTickerDebugEnabled(): boolean {
  return debugEnabled;
}
