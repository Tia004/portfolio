'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type LenisContextValue = {
  lenis: RefObject<Lenis | null>;
};

const LenisContext = createContext<LenisContextValue>({ lenis: { current: null } });

export function useLenis() {
  return useContext(LenisContext);
}

type Props = { children: ReactNode };

export default function SmoothScrollProvider({ children }: Props) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.6,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
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
