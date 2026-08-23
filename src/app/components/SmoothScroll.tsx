'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import type Lenis from 'lenis';

type LenisContextValue = {
  lenis: RefObject<Lenis | null>;
};

// HomeShell creates the provider around its own render tree, so its hooks run
// one level before the provider exists. Sharing this ref keeps CTA handlers and
// descendants connected to the same Lenis instance.
const sharedLenisRef: { current: Lenis | null } = { current: null };
const LenisContext = createContext<LenisContextValue>({ lenis: sharedLenisRef });

export function useLenis() {
  return useContext(LenisContext);
}

type Props = { children: ReactNode };

export default function SmoothScrollProvider({ children }: Props) {
  const lenisRef = sharedLenisRef;

  useEffect(() => {
    // Dynamically import the smooth-scroll + animation runtime (Lenis + GSAP
    // + ScrollTrigger, ~110KB) instead of importing it statically: the whole
    // runtime leaves the critical-path bundle and starts downloading only
    // after the first paint (idle). The splash covers the first ~0.9s anyway,
    // so deferring the init is invisible to the user — and the module is
    // already in memory by the time the splash fades and the first scroll
    // happens. `loadGsap()` caches the promise, so reveal components share
    // the same module instance.
    let alive = true;
    let frameId = 0;
    let destroy: (() => void) | null = null;

    const init = async () => {
      if (!alive) return;
      const [lenisModule, gsapModule, stModule] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (!alive) return;
      const LenisCtor = lenisModule.default ?? lenisModule;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = stModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new LenisCtor({
        duration: 1.0,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
        // Nested scroll containers (chat messages, textareas) scroll NATIVELY,
        // and when their overscroll chains into the page Lenis syncs its own
        // position via onNativeScroll — no fight, no up/down jitter, and the
        // page keeps scrolling when a container hits its boundary (the old
        // overscroll-contain approach ate the wheel entirely: the page was
        // stuck at the chatbot).
        allowNestedScroll: true,
        // Respect data-lenis-prevent: any element (or ancestor) with this
        // attribute gets native scroll — used by the ServiceSelect dropdown
        // and any other overflow-y-auto container that must never chain.
        prevent: (node: Element) => node.closest('[data-lenis-prevent]') !== null,
      });

      lenisRef.current = lenis;

      // Notify listeners (HomeShell's resize sync) that the instance exists —
      // the dynamic import resolves after their effects first ran, so any
      // instance captured at effect time would have been null forever.
      window.dispatchEvent(new Event('tia:lenis-ready'));

      // Integrate GSAP ScrollTrigger with Lenis
      lenis.on('scroll', () => ScrollTrigger.update());

      function raf(time: number) {
        lenis.raf(time);
        frameId = requestAnimationFrame(raf);
      }

      frameId = requestAnimationFrame(raf);

      destroy = () => {
        cancelAnimationFrame(frameId);
        ScrollTrigger.getAll().forEach(t => t.kill());
        lenis.destroy();
        lenisRef.current = null;
      };
    };

    // Start immediately on mount — the DYNAMIC import is what keeps Lenis +
    // GSAP + ScrollTrigger out of the critical-path bundle (they download and
    // execute in a separate chunk after the first paint). Do NOT defer with
    // requestIdleCallback: under CPU throttling (Lighthouse lab, low-end
    // phones) the idle slot may never fire, leaving Lenis/GSAP unloaded and
    // the hero entrance stuck → LCP explodes. An immediate dynamic import is
    // already non-blocking for the initial render.
    init();

    return () => {
      alive = false;
      destroy?.();
    };
  }, []);

  const ctx = useMemo(() => ({ lenis: lenisRef }), []);

  return (
    <LenisContext.Provider value={ctx}>
      {children}
    </LenisContext.Provider>
  );
}
