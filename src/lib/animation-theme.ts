/**
 * Animation Theme — centralised configuration for all GSAP animations.
 * Change values here to update every section at once.
 *
 * @category Animations
 */

// ── StaggerReveal (card grids: Servizi, Prezzi, Progetti, Contatti) ──

export const STAGGER_DEFAULTS = {
  yOffset: 36,
  duration: 0.7,
  stagger: 0.08,
  ease: 'elastic.out(1,0.75)',
  start: 'top 88%',
  end: 'bottom 12%',
} as const;

// Stagger delay per section — slightly different so each section
// "cascades" as the user scrolls
export const STAGGER_BY_SECTION = {
  servizi: 0.06,
  prezzi: 0.07,
  progetti: 0.08,
  contatti: 0.06,
} as const;

// ── ScrollReveal (section headings) ──

export const REVEAL_DEFAULTS = {
  yOffset: 40,
  duration: 0.8,
  delay: 0,
  ease: 'power3.out',
  start: 'top 85%',
  end: 'top 20%',
  scrubAmount: 0.3,
} as const;

// ── Layout constants ──

/** Skill title left-offset — shared between the Tailwind padding class
 *  and the CSS custom property that positions the vertical accent line.
 *  Clamped: 2rem on mobile, 10vw on desktop, capped at 8rem on ultrawide. */
export const SKILL_TITLE_OFFSET = 'clamp(2rem, 10vw, 8rem)' as const;

// ── Hero entrance (cinematic: text descends from above, sharpens, lands) ──

export const HERO = {
  yOffset: -60,        // negative = starts above viewport, descends into place
  scale: 1.04,         // slight zoom-in as it settles
  blur: 4,             // noticeable entrance blur, clears on arrival (px)
  // Snappy: the hero — the LCP element — must reach its sharp state quickly
  // after the splash fades. 0.9s → 0.5s → 0.35s, smaller stagger, no delay.
  duration: 0.35,
  stagger: 0.04,
  ease: 'power4.out',
  delay: 0,
} as const;

// ── CountUp (pricing / hero numbers) ──

export const COUNTUP = {
  /** Base delay for the first card (seconds). Kept minimal so the first card reacts instantly. */
  staggerBase: 0.05,
  /** Delay increment per subsequent card (seconds). Small step for subtle cascade without making later cards wait forever. */
  staggerStep: 0.05,
  /** Total GSAP tween duration for the count-up animation. */
  duration: 2.8,
  /** Timing function applied to the count-up progression. */
  ease: 'power3.out',
  /** ScrollTrigger start position relative to viewport. */
  scrollStart: 'top 85%',
  /** Duration of the glow flash after count completes (ms). */
  glowMs: 600,
  /** Duration of the scale pulse after count completes (ms). */
  pulseMs: 400,
} as const;

// ── Hero-specific CountUp delays (staggered manually for visual rhythm) ──

// CountUp delays are relative to splashDone (when ready becomes true).
// The hero entrance animation completes at ~0.7s; counts start cascading
// just as the last elements settle into place.
export const HERO_COUNTUP_DELAYS = [0.5, 0.65, 0.8, 0.95, 1.1] as const;

// ── Footer parallax ──

export const FOOTER = {
  contentParallax: {
    yOffset: 50,
    scale: 0.97,                   // starts slightly shrunk, "breathes" into full size
    ease: 'elastic.out(1,0.6)',   // subtle bounce when settling
    start: 'top bottom',
    end: 'bottom bottom',
    scrub: 0.5,                    // slightly snappier for the bounce to read
  },
  glow: {
    ease: 'none',
    scrub: 0.8,
    start: 'top bottom',
    end: 'bottom top',
  },
  chars: {
    yOffset: 80,
    rotateX: -15,
    stagger: 0.04,
    duration: 1,
    ease: 'power4.out',
    start: 'top 75%',
    end: 'top 35%',
    scrub: 1,
  },
} as const;

/**
 * Quick-access: stagger delay for a given section key.
 * Falls back to STAGGER_DEFAULTS.stagger if section not found.
 */
export function getStagger(section: keyof typeof STAGGER_BY_SECTION): number {
  return STAGGER_BY_SECTION[section];
}

// ── Scroll offsets — per-section extra pixels on top of getProgressiveBlurOffset() ──

/** Per-section extra offset (added to the progressive-blur base offset).
 *  Sections with a filter bar, toggle, or other UI above the heading
 *  need a few extra pixels so the heading isn't clipped.
 *
 *  Shared between Navbar and Footer so every internal link lands on
 *  the exact same spot regardless of which navigation element was clicked. */
export const SECTION_OFFSETS: Record<string, number> = {
  progetti: 24,   // category filter bar
  prezzi: 16,     // "Una tantum / Collaborazione" toggle
  chisono: 8,     // tight typewriter heading
  chatbot: 16,    // extra breathing room (navbar+blur already in base offset)
} as const;
