'use client';

// ── Lazy loader for GSAP + ScrollTrigger ────────────────────
// Importing `gsap`/`gsap/ScrollTrigger` statically anywhere pulls the whole
// animation runtime into the critical-path bundle. This module is the ONLY
// place that imports them (via dynamic import), so the bundler can split
// them into a lazy chunk that starts downloading after the first paint.
// Every component that needs GSAP calls `loadGsap()` inside its effect —
// the promise is cached, so the module is fetched/executed exactly once.
//
// This is the "code-splitting of the bootstrap" lever: GSAP core + ScrollTrigger
// (~110KB combined) leave the LCP/TBT critical path and load in the idle gap
// after the first paint, when the splash already covers the hero.
let gsapPromise: Promise<typeof import('gsap')['gsap']> | null = null;

export function loadGsap() {
  if (!gsapPromise) {
    gsapPromise = Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([gsapModule, stModule]) => {
      gsapModule.gsap.registerPlugin(stModule.ScrollTrigger);
      return gsapModule.gsap;
    });
  }
  return gsapPromise;
}

export type Gsap = Awaited<ReturnType<typeof loadGsap>>;
