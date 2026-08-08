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
      scrollToElement(target, controller, options);
    });
  });
}
