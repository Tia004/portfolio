'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
    const lenis = new Lenis({
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
      prevent: (node) => node.closest('[data-lenis-prevent]') !== null,
    });

    lenisRef.current = lenis;

    // Integrate GSAP ScrollTrigger with Lenis
    lenis.on('scroll', () => ScrollTrigger.update());

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const ctx = useMemo(() => ({ lenis: lenisRef }), []);

  return (
    <LenisContext.Provider value={ctx}>
      {children}
    </LenisContext.Provider>
  );
}
