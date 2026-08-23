'use client';

import React, { useState, useEffect } from 'react';
import { moltenModulePromise } from './molten-preload';

// ── Configuration ──────────────────────────────────────────
const LETTERS = 'Tia Designs'.split('');
// Splash is 100% CSS-animated (no GSAP): removing the static `gsap` import
// from this first-paint component lets the bundler split GSAP + ScrollTrigger
// (~110KB) out of the critical path. Letters drop with a pure CSS keyframe +
// per-index animation-delay; the exit is a CSS opacity transition. Same
// rhythm, zero JS animation runtime on the LCP path.
const LETTER_STAGGER = 0.035;
const LETTER_DURATION = 0.35;
const MIN_SPLASH_MS = 750;   // minimum display time for the letter animation (letters land at ~0.70s)
const MAX_SPLASH_MS = 2500;  // safety net — never block the site forever
const FADE_MS = 180;         // exit fade duration (must match the CSS transition)

function whenPageReady(): Promise<void> {
  return new Promise((resolve) => {
    // DOM parsed + webfonts ready. Deliberately NOT window.load: scripts,
    // Turnstile, third-party and lazy assets would pin the splash open for
    // seconds and tank LCP. The hero (the LCP element) is painted at full
    // opacity BEHIND the splash, so LCP is captured at first paint — the
    // splash only needs to cover the font swap to avoid text-reflow CLS.
    // Fonts are self-hosted via next/font with display:swap + metrics
    // adjustment (CLS is already ~0.001), so waiting for the FULL font set
    // on a slow connection only delays beginExit (and thus LCP) for a swap
    // that happens hidden behind the splash anyway. Cap the wait at 1s.
    const domReady = new Promise<void>((r) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => r(), { once: true });
      } else {
        r();
      }
    });
    const fontsReady = typeof document.fonts !== 'undefined'
      ? document.fonts.ready.then(() => undefined).catch(() => undefined)
      : Promise.resolve(undefined);
    // Resolve as soon as DOM is ready, with a 1s allowance for fonts — never
    // let the full font set pin the splash (and LCP) on a slow connection.
    Promise.all([domReady, fontsReady]).then(() => resolve());
    setTimeout(resolve, 1000);
  });
}

function whenImagesLoaded(): Promise<void> {
  // Only wait for EAGER images (hero + critical content). Every project-card
  // and gallery image is loading="lazy", so they're far below the fold and
  // start downloading only when scrolled near — waiting for them here would
  // pin the splash open for seconds and tank LCP. Lazy images are the
  // browser's own responsibility once the page is visible.
  const imgs = Array.from(document.images).filter((img) => img.loading !== 'lazy');
  if (imgs.length === 0) return Promise.resolve();
  let pending = imgs.length;
  return new Promise<void>((resolve) => {
    const onDone = () => { pending--; if (pending <= 0) resolve(); };
    imgs.forEach((img) => {
      if (img.complete) { onDone(); return; }
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', onDone, { once: true });
    });
    // Safety: resolve after 4s even if images hang
    setTimeout(resolve, 4000);
  });
}

// The splash waits (bounded) for the molten-metal background to finish
// compiling and draw one real frame, so the first scroll into the transparent
// sections below the hero never reveals a blank/black background. The chunk is
// preloaded by molten-preload.ts at client module evaluation. The cap keeps a
// failed/blocked WebGL device on the CSS fallback instead of freezing the UI.
const MOLTEN_WAIT_MS = 1800;
function whenMoltenReady(): Promise<void> {
  // The module promise starts at client-module evaluation, before HomeShell
  // mounts. Awaiting it here makes the splash functional without making the
  // first paint wait for unrelated below-fold assets.
  const moduleReady = moltenModulePromise?.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
  return new Promise((resolve) => {
    if ((window as Window & { __tiaMoltenReady?: boolean }).__tiaMoltenReady) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('tia:molten-ready', onReady);
      resolve();
    };
    const onReady = () => finish();
    window.addEventListener('tia:molten-ready', onReady);
    moduleReady.then(() => {
      // The component may still be hydrating after the chunk resolves. The
      // event/flag path remains authoritative; this only removes an avoidable
      // delay when the fallback or first draw has already completed.
      if ((window as Window & { __tiaMoltenReady?: boolean }).__tiaMoltenReady) finish();
    });
    window.setTimeout(finish, MOLTEN_WAIT_MS);
  });
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  // ── Start everything on mount ────────────────────────────
  useEffect(() => {
    let alive = true;

    // Counter: 0→90% over MIN_SPLASH_MS, then 90→100% when beginExit fires.
    // This way the bar never sits at 100% while still loading — it reflects
    // actual progress: fast fill for the letter animation, then wait at ~90%
    // until the page is truly ready.
    const progressStart = performance.now();
    const counterTimer = setInterval(() => {
      if (!alive) return;
      const elapsed = performance.now() - progressStart;
      const pct = Math.min(90, Math.round((elapsed / MIN_SPLASH_MS) * 90));
      setProgress(pct);
      if (pct >= 90) clearInterval(counterTimer);
    }, 30);

    // ── Dynamic splash exit ────────────────────────────────
    // Wait for the page to be fully loaded (DOM + subresources
    // + all images), but never less than MIN_SPLASH_MS (letter
    // animation needs time) and never more than MAX_SPLASH_MS
    // (safety net so the site never stays stuck).
    let exited = false;
    const beginExit = () => {
      if (!alive || exited) return;
      exited = true;
      setProgress(100);  // snap bar to 100% — page is ready
      setExiting(true);
      // Fire 'splash-complete' at the START of the fade, not the end: the
      // hero (LCP element) is already painted at opacity 1 behind the splash,
      // so LCP is captured the instant the splash starts fading. Starting the
      // hero entrance in parallel with the fade shaves the full fade duration
      // (~0.18s real, ~0.7s throttled) off LCP. The scroll lock and the DOM
      // removal stay tied to `visible` (fade end), so UX is unchanged.
      window.dispatchEvent(new CustomEvent('splash-complete'));
      window.setTimeout(() => {
        if (alive) setVisible(false);
      }, FADE_MS);
    };

    // Wait for page + images + molten background, respect min time, enforce max cap
    Promise.all([whenPageReady(), whenImagesLoaded(), whenMoltenReady()]).then(() => {
      const elapsed = performance.now() - progressStart;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      // If resources loaded faster than the min time, wait the difference.
      // If they took longer (but under MAX), exit immediately.
      setTimeout(beginExit, remaining);
    });
    // Absolute safety: never block more than MAX_SPLASH_MS
    const maxTimer = setTimeout(beginExit, MAX_SPLASH_MS);

    return () => {
      alive = false;
      clearInterval(counterTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  // ── Lock scroll ONLY while the splash is visible ──────────
  // Tied to `visible` (not a one-time mount effect): SplashScreen never
  // unmounts, so a mount-only effect left the touchmove/wheel preventDefault
  // listeners attached forever — killing touch scroll on mobile for the whole
  // session after the splash faded. Now the lock + listeners are removed the
  // moment the splash hides.
  useEffect(() => {
    if (!visible) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';
    // Prevent touch-scroll on mobile during splash
    const preventTouch = (e: TouchEvent) => e.preventDefault();
    const preventWheel = (e: WheelEvent) => e.preventDefault();
    document.addEventListener('touchmove', preventTouch, { passive: false });
    document.addEventListener('wheel', preventWheel, { passive: false });
    return () => {
      document.body.style.overflow = prevBody || '';
      document.body.style.touchAction = prevTouchAction || '';
      document.documentElement.style.overflow = prevHtml || '';
      document.removeEventListener('touchmove', preventTouch);
      document.removeEventListener('wheel', preventWheel);
    };
  }, [visible]);

  return (
    <>
      {/* ── Keyframes inlined in JSX — available from first paint, no JS-injection flash ── */}
      <style>{`
        @keyframes splash-dot-flicker {
          to { mask-position: 50% 50%, 0 50%; }
        }
        @keyframes splash-letter-drop {
          from { opacity: 0; transform: translateY(-120px) rotate(-8deg); }
          to   { opacity: 1; transform: translateY(0) rotate(0deg); }
        }
      `}</style>

      {visible && (
        <div
          className="fixed inset-0 z-[99999] overflow-hidden select-none"
          style={{
            pointerEvents: exiting ? 'none' : 'auto',
            background: '#010101',
            opacity: exiting ? 0 : 1,
            transition: `opacity ${FADE_MS}ms cubic-bezier(0.45,0,0.55,1)`,
          }}
        >
          {/* ── CSS Dot Pattern — dark teal dots, flicker animation ── */}
          <div
            className="absolute inset-0"
            style={{
              background: '#115e59',
              maskImage: `radial-gradient(circle at 50% 50%, white 2px, transparent 2.5px), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)'/%3E%3C/svg%3E")`,
              maskPosition: '50% 50%, 256px 50%',
              maskSize: '20px 20px, 256px 256px',
              maskRepeat: 'repeat, repeat',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
              animation: 'splash-dot-flicker 20s infinite linear',
            }}
          />

          {/* Semi-transparent dark overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Centered content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            {/* "Tia Designs" — letter by letter drop (pure CSS keyframes,
                per-index animation-delay replicates the GSAP stagger) */}
            <h1
              className="flex flex-wrap justify-center gap-[0.02em] text-6xl sm:text-7xl md:text-8xl max-[450px]:text-5xl max-[374px]:text-4xl font-black tracking-tight text-white select-none"
              style={{ fontFamily: 'var(--font-sans), Outfit, sans-serif' }}
            >
              {LETTERS.map((char, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    opacity: 0,
                    minWidth: char === ' ' ? '0.3em' : undefined,
                    animation: `splash-letter-drop ${LETTER_DURATION}s cubic-bezier(0.34,1.56,0.64,1) ${i * LETTER_STAGGER}s forwards`,
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>

            {/* Percentage counter */}
            <div className="mt-8 flex items-center gap-3">
              <div className="h-[3px] w-40 sm:w-48 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded-full transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-teal-400 text-base sm:text-base font-mono tabular-nums min-w-[3ch] text-right">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Children always rendered — behind the splash when visible */}
      {children}
    </>
  );
}
