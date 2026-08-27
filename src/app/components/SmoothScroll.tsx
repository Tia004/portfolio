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
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    let alive = true;
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
        lerp: 0.08,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
        infinite: false,
        syncTouch: false,
        autoResize: true,
        allowNestedScroll: true,
        prevent: (node: Element) => node.closest('[data-lenis-prevent]') !== null,
      });

      lenisRef.current = lenis;

      // Notify listeners (HomeShell's resize sync) that the instance exists
      window.dispatchEvent(new Event('tia:lenis-ready'));

      // Integrate GSAP ScrollTrigger with Lenis
      lenis.on('scroll', () => ScrollTrigger.update());

      // Native requestAnimationFrame loop providing synchronized performance.now() timestamps
      let frameId = 0;
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
