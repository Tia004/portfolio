'use client';

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// ── Configuration ──────────────────────────────────────────
const LETTERS = 'Tia Designs'.split('');
const LETTER_STAGGER = 0.08;
const LETTER_DROP_Y = -120;
const LETTER_DURATION = 0.8;
const MIN_SPLASH_MS = 2500;  // minimum display time for the letter animation
const MAX_SPLASH_MS = 8000;  // safety net — never block the site forever

function whenPageReady(): Promise<void> {
  return new Promise((resolve) => {
    // Already fully loaded
    if (document.readyState === 'complete') { resolve(); return; }
    // Wait for DOM + all subresources (images, frames)
    window.addEventListener('load', () => resolve(), { once: true });
    // Safety: resolve after 5s even if load event never fires
    setTimeout(resolve, 5000);
  });
}

function whenImagesLoaded(): Promise<void> {
  const imgs = Array.from(document.images);
  if (imgs.length === 0) return Promise.resolve();
  let pending = imgs.length;
  return new Promise<void>((resolve) => {
    const onDone = () => { pending--; if (pending <= 0) resolve(); };
    imgs.forEach((img) => {
      if (img.complete) { onDone(); return; }
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', onDone, { once: true });
    });
    // Safety: resolve after 6s even if images hang
    setTimeout(resolve, 6000);
  });
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const splashRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [progress, setProgress] = useState(0);

  // ── Start everything on mount ────────────────────────────
  useEffect(() => {
    let alive = true;

    // Use gsap.context() to properly kill all tweens on cleanup
    const ctx = gsap.context(() => {
      // Letter drop — letters start invisible (opacity:0 in JSX),
      // set initial position above viewport, then animate down
      gsap.set(letterRefs.current.filter(Boolean), {
        y: LETTER_DROP_Y,
        rotate: -8,
      });

      gsap.to(letterRefs.current.filter(Boolean), {
        y: 0,
        opacity: 1,
        rotate: 0,
        duration: LETTER_DURATION,
        stagger: LETTER_STAGGER,
        ease: 'back.out(1.4)',
      });
    });

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
      gsap.to(splashRef.current, {
        opacity: 0,
        scale: 0.97,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          if (alive) {
            setVisible(false);
            window.dispatchEvent(new CustomEvent('splash-complete'));
          }
        },
      });
    };

    // Wait for page + images, respect min time, enforce max cap
    Promise.all([whenPageReady(), whenImagesLoaded()]).then(() => {
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
      ctx.revert();
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
      `}</style>

      {visible && (
        <div
          ref={splashRef}
          className="fixed inset-0 z-[99999] overflow-hidden select-none"
          style={{
            pointerEvents: exiting ? 'none' : 'auto',
            background: '#010101',
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
            {/* "Tia Designs" — letter by letter drop */}
            <h1
              className="flex flex-wrap justify-center gap-[0.02em] text-5xl sm:text-7xl md:text-8xl max-[450px]:text-4xl max-[374px]:text-3xl font-black tracking-tight text-white select-none"
              style={{ fontFamily: 'var(--font-sans), Outfit, sans-serif' }}
            >
              {LETTERS.map((char, i) => (
                <span
                  key={i}
                  ref={(el) => { letterRefs.current[i] = el; }}
                  className="inline-block"
                  style={{ opacity: 0, minWidth: char === ' ' ? '0.3em' : undefined }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>

            {/* Percentage counter */}
            <div className="mt-8 flex items-center gap-3">
              <div className="h-[2px] w-32 sm:w-48 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded-full transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-teal-400 text-sm sm:text-base font-mono tabular-nums min-w-[3ch] text-right">
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
