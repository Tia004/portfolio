// ── Scroll-aware ScrollTrigger.refresh() ────────────────────
// ScrollTrigger is loaded lazily (loadGsap caches the promise) — this module
// never imports it statically, so the animation runtime stays out of the
// critical-path bundle.
// ScrollTrigger.refresh() recalculates every trigger position. When several
// elements intersect during ONE fast gesture (ScrollReveal/StaggerReveal fire
// their IO as the page flies past) each callback called refresh() while Lenis
// was mid-animation — GSAP writes the scroll position back and Lenis corrects
// it on the next frame: the classic tiny up/down jitter. This helper skips
// refresh during an active gesture and batches bursts into a single refresh.
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let lastScrollAt = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => { lastScrollAt = Date.now(); }, { passive: true, capture: true });
}

let scrollTriggerPromise: Promise<typeof import('gsap/ScrollTrigger')['ScrollTrigger']> | null = null;
function getScrollTrigger() {
  if (!scrollTriggerPromise) {
    scrollTriggerPromise = import('gsap/ScrollTrigger').then((m) => m.ScrollTrigger);
  }
  return scrollTriggerPromise;
}

export function refreshScrollTriggers(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    if (Date.now() - lastScrollAt < 300) return;
    getScrollTrigger().then((ScrollTrigger) => {
      ScrollTrigger.refresh();
    });
  }, 350);
}

export interface SmoothScrollController {
  scroll?: number;
  scrollTo: (target: number, options?: Record<string, unknown>) => void;
}

type ScrollControllerSource = SmoothScrollController | null | undefined | (() => SmoothScrollController | null | undefined);

interface ScrollOptions {
  offsetPx?: number;
  duration?: number;
  onComplete?: () => void;
}

// ── Fixed offset — accounts for the navbar + progressive blur ───
// The navbar is ~4rem (64 px at default font-size) and the blur sits
// underneath it.  120 px keeps section headings comfortably below the
// blur on every screen size without pushing them so far down that the
// previous section peeks through.
const BASE_OFFSET = 120;

function resolveElement(target: string | HTMLElement): HTMLElement | null {
  if (typeof target !== 'string') return target;
  const id = target.startsWith('#') ? target.slice(1) : target;
  return document.getElementById(id)
    ?? document.getElementById(`${id}-anchor`)
    ?? document.querySelector<HTMLElement>(target);
}

/**
 * Scroll an element into view with a single smooth animation.
 * Places the element BASE_OFFSET pixels from the top of the viewport
 * so it clears the fixed navbar + progressive blur.
 */
export function scrollToElement(
  target: string | HTMLElement,
  controller?: ScrollControllerSource,
  options: ScrollOptions = {},
): boolean {
  const element = resolveElement(target);
  if (!element) return false;

  const activeController = typeof controller === 'function' ? controller() : controller;
  // Use window.scrollY directly — never rely on activeController.scroll.
  // Lenis may report a stale or unsynchronized value for its `scroll`
  // property, which makes the target calculation land on the wrong section.
  const currentScroll = window.scrollY;
  const documentTop = currentScroll + element.getBoundingClientRect().top;
  const totalOffset = BASE_OFFSET + (options.offsetPx ?? 0);
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetScroll = Math.min(Math.max(0, documentTop - totalOffset), maxScroll);

  if (activeController) {
    // Lenis caches the document height internally. After LazySection
    // force-mounts the page grew taller, so refresh its scroll limits
    // before asking it to move — otherwise scrollTo silently clamps to
    // the stale, smaller max ("click does nothing" after menu nav).
    (activeController as { resize?: () => void }).resize?.();
    activeController.scrollTo(targetScroll, {
      duration: options.duration ?? 1.2,
      lock: true,
      force: true,
      onComplete: options.onComplete,
    });
  } else {
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    if (options.onComplete) window.setTimeout(options.onComplete, (options.duration ?? 1.2) * 1000);
  }

  return true;
}

/** Trigger the section-arrival-glow CSS animation on a section element. */
export function triggerArrivalGlow(sectionId: string): void {
  const el = document.getElementById(sectionId) ?? document.getElementById(`${sectionId}-anchor`);
  if (el) {
    el.classList.add('section-arrival-glow');
    setTimeout(() => el.classList.remove('section-arrival-glow'), 800);
  }
}

/** Wait two frames for React to commit layout, then scroll. */
export function scrollToElementAfterLayout(
  target: string | HTMLElement,
  controller?: ScrollControllerSource,
  options: ScrollOptions = {},
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Some sections (progetti, prezzi, chisono, …) are wrapped in LazySection
      // and are NOT in the DOM until scrolled near. Mount them all first so
      // the anchor exists, then retry briefly while React commits.
      window.dispatchEvent(new Event('tia:force-mount'));
      const attempt = (n: number) => {
        if (n <= 0) return;
        if (scrollToElement(target, controller, options)) return;
        // Element not mounted yet — wait a frame for React to commit.
        requestAnimationFrame(() => attempt(n - 1));
      };
      attempt(8);
    });
  });
}

/**
 * Scroll to a lazily-mounted section and KEEP it in place while the layout
 * settles.
 *
 * `scrollToElementAfterLayout` computes the target from the document as it is
 * at that instant and then stops — but the LazySection blocks ABOVE the target
 * mount a beat later and push it hundreds of pixels further down, so the click
 * lands short of the section it aimed at. This variant re-aims whenever the
 * target moves: the first frame is already responsive, and the final position
 * is correct. Corrections use a short duration so they read as the page
 * settling rather than as a second navigation.
 */
export function scrollToElementFollowingLayout(
  target: string | HTMLElement,
  controller?: ScrollControllerSource,
  options: ScrollOptions = {},
): void {
  window.dispatchEvent(new Event('tia:force-mount'));
  const deadline = Date.now() + 2000;
  let lastTop = Number.NaN;
  let stableTicks = 0;
  let scrolledOnce = false;
  const tick = () => {
    const element = resolveElement(target);
    if (element) {
      const top = Math.round(element.getBoundingClientRect().top + window.scrollY);
      if (top !== lastTop) {
        lastTop = top;
        stableTicks = 0;
        scrollToElement(target, controller, {
          ...options,
          duration: scrolledOnce ? 0.35 : (options.duration ?? 0.7),
        });
        scrolledOnce = true;
      } else {
        stableTicks += 1;
      }
    }
    // Four quiet ticks (~480ms) mean the layout has stopped growing; the 2s
    // deadline is the escape hatch for a page that keeps repainting.
    if (Date.now() < deadline && stableTicks < 4) {
      window.setTimeout(tick, 120);
    } else if (options.onComplete) {
      options.onComplete();
    }
  };
  tick();
}
