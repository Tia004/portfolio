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
      // Respect data-lenis-prevent: any element (or ancestor) with this
      // attribute gets native scroll — used by ServiceSelect dropdown,
      // chatbot message area, and any other overflow-y-auto container.
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
