'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import TiaIcon from './TiaIcon';
import { ArrowRight01Icon } from './icons';

interface MobileSnapSliderProps {
  children: ReactNode;
  /**
   * Classes for the scroll track. Must include the mobile flex/snap classes
   * (flex, overflow-x-auto, snap-x, snap-mandatory) AND the responsive
   * desktop overrides (md:grid …, md:overflow-visible, md:snap-none).
   */
  trackClassName?: string;
  /** Extra classes for the outer wrapper. */
  className?: string;
  ariaLabel?: string;
  /** Classes for the arrow row. Default hides it on md+ (desktop uses the grid). */
  arrowsClassName?: string;
}

/**
 * Mobile horizontal snap carousel (Apple-style): swipe with the finger,
 * arrow buttons bottom-right that scroll one card at a time, dimmed when
 * the track is at either limit. On desktop the same track switches to a
 * CSS grid (md:overflow-visible md:snap-none), so one element serves both
 * layouts. The trailing ::after spacer (from trackClassName) guarantees
 * the last card can always snap to the left edge.
 */
export default function MobileSnapSlider({
  children,
  trackClassName = '',
  className = '',
  ariaLabel = 'Carosello',
  arrowsClassName = 'md:hidden',
}: MobileSnapSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [nativeTrack, setNativeTrack] = useState(false);

  // Only mobile snap tracks need Lenis to step aside. On desktop the same
  // element becomes a CSS grid; marking it as a nested scroll container there
  // makes the wheel appear to stop over the pricing cards.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setNativeTrack(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    // Images loading later change the track width → re-check the limits.
    const imgs = Array.from(el.querySelectorAll('img'));
    imgs.forEach((img) => img.addEventListener('load', updateArrows));
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
      imgs.forEach((img) => img.removeEventListener('load', updateArrows));
    };
  }, [updateArrows]);

  // Re-check when children change (e.g. category filter on projects).
  useEffect(() => {
    updateArrows();
  }, [updateArrows, children]);

  // ── Mouse/pen drag-to-scroll (narrow desktop windows) ──────
  // Mobile/touch keeps the native horizontal swipe (momentum included);
  // this adds click-and-drag for mouse users on sub-768px windows where
  // the track is a flex scroll container. Listeners live on window during
  // the drag so it keeps tracking even when the pointer leaves the track.
  //
  // Feel: like a real mobile scroll — the track follows the pointer with
  // zero lag, and on release it keeps gliding with friction (momentum)
  // before stopping at whatever position it reached. Snap is NOT restored
  // after a mouse drag, so the track never "sticks" to a card; the wheel
  // always scrolls the page (see removed wheel handler). A drag of >5px
  // suppresses the click that follows pointerup (otherwise releasing over
  // a card would open its modal).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let drag: { startX: number; startLeft: number; moved: number } | null = null;
    let suppressClick = false;
    let vel = 0; // px/ms, smoothed
    let lastT = 0;
    let inertiaRaf = 0;

    const stopInertia = () => {
      if (inertiaRaf) { cancelAnimationFrame(inertiaRaf); inertiaRaf = 0; }
    };

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const now = performance.now();
      const dx = e.clientX - drag.startX;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      const prev = el.scrollLeft;
      el.scrollLeft = drag.startLeft - dx;
      const dt = now - lastT;
      if (dt > 0) {
        // Exponential smoothing — a single jittery move can't spike the
        // release velocity; the glide feels natural.
        const inst = (el.scrollLeft - prev) / dt; // px/ms
        vel = inst * 0.3 + vel * 0.7;
      }
      lastT = now;
    };

    const runInertia = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.scrollLeft += vel * 16; // ~1 frame of travel
      vel *= 0.94; // friction — decays the glide naturally
      if (el.scrollLeft <= 0 || el.scrollLeft >= max) {
        el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft));
        return;
      }
      if (Math.abs(vel) < 0.02) return; // settled
      inertiaRaf = requestAnimationFrame(runInertia);
    };

    const onUp = () => {
      if (!drag) return;
      if (drag.moved > 5) suppressClick = true;
      drag = null;
      el.style.userSelect = '';
      el.classList.remove('cursor-grabbing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      // Free scroll: snap stays disabled so it rests wherever it stopped,
      // exactly like a mobile scroll. A flick keeps gliding via friction.
      if (Math.abs(vel) > 0.05) runInertia();
    };
    const onDown = (e: PointerEvent) => {
      // Touch re-enables the native Apple-style snap (class-based); mouse
      // keeps free scroll with friction.
      if (e.pointerType !== 'mouse') {
        if (e.pointerType === 'touch') el.style.scrollSnapType = '';
        return;
      }
      if (e.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth + 1) return; // not scrollable
      stopInertia();
      drag = { startX: e.clientX, startLeft: el.scrollLeft, moved: 0 };
      suppressClick = false;
      vel = 0;
      lastT = performance.now();
      el.style.scrollSnapType = 'none';
      el.style.userSelect = 'none';
      el.classList.add('cursor-grabbing');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };
    // Capture phase: runs before any card's onClick (project modal, price
    // CTA) so a released drag never triggers a click.
    const onClick = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      stopInertia();
    };
  }, []);

  // ── Thumbnail preload ─────────────────────────────────────────
  // Native `loading="lazy"` only considers the page viewport, so images
  // further right in the horizontal track would start downloading only
  // when swiped near — visible pop-in during a fast swipe. As soon as the
  // track nears the viewport, flip its lazy images to eager so the whole
  // strip is fetched while the user reads the section. Hidden tracks
  // (e.g. the projects slider is md:hidden on desktop) are skipped via
  // the offsetParent guard — the desktop grid keeps native lazy loading.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const activate = () => {
      if (el.offsetParent === null) return; // display:none → desktop layout
      el.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
        img.loading = 'eager';
        img.decoding = 'async';
      });
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        activate();
        io.disconnect();
      }
    }, { rootMargin: '300px 0px' });
    io.observe(el);
    activate(); // already on screen (LazySection may mount it close)
    return () => io.disconnect();
  }, []);

  // ── Mobile auto-glow on the focused card ──────────────────────
  // Touch devices have no hover, so the card currently most visible in the
  // track gets a border glow that runs CONTINUOUSLY: the CSS animation on
  // .scroll-glow-active rotates --cursor-angle forever, so the beam travels
  // around the border by itself as long as the card stays highlighted — no
  // tap needed. The highlight follows the scroll: when it settles, the
  // center card becomes the active one and the previous card's glow fades.
  // When the whole track leaves the viewport the glow is cleared, so no
  // off-screen card keeps burning GPU.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (!window.matchMedia('(max-width: 767px)').matches) return; // mobile carousel only

    let activeCard: HTMLElement | null = null;
    let settleTimer: number | null = null;

    const cards = () => Array.from(el.querySelectorAll<HTMLElement>('.border-glow-card'));

    const activate = (card: HTMLElement | null) => {
      if (!card) return;
      if (activeCard === card) return;
      if (activeCard) activeCard.classList.remove('scroll-glow-active');
      activeCard = card;
      card.classList.add('scroll-glow-active');
    };

    const clearActive = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = null;
      if (activeCard) {
        activeCard.classList.remove('scroll-glow-active');
        activeCard = null;
      }
    };

    const centerCard = (): HTMLElement | null => {
      if (el.scrollWidth <= el.clientWidth + 2) return null; // nothing to scroll
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      for (const c of cards()) {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - cx);
        if (d < bestD) { bestD = d; best = c; }
      }
      return best;
    };

    const onScroll = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => activate(centerCard()), 150);
    };
    // Tap on a card always highlights it (capture phase, before the card's
    // own click handler scrolls or opens a modal).
    const onClick = (e: Event) => {
      const card = (e.target as HTMLElement).closest('.border-glow-card') as HTMLElement | null;
      if (card) activate(card);
    };

    // Clear the glow once the track leaves the viewport (no off-screen burn).
    const trackIo = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onScroll();
      } else {
        clearActive();
      }
    }, { rootMargin: '100px 0px' });
    trackIo.observe(el);

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('click', onClick, true);
    // Initial highlight + re-arm when children change (category filter re-renders).
    activate(centerCard());

    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('click', onClick, true);
      trackIo.disconnect();
      if (settleTimer) clearTimeout(settleTimer);
      if (activeCard) activeCard.classList.remove('scroll-glow-active');
    };
  }, [children]);

  const scrollDir = useCallback((dir: 1 | -1) => {
    // Haptic tick on the arrow buttons (mobile-only — the arrow row is
    // md:hidden, and navigator.vibrate only exists on mobile browsers).
    navigator.vibrate?.(12);
    const el = trackRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = first ? first.offsetWidth + gap : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  const baseBtn = 'h-10 w-10 sm:h-9 sm:w-9 rounded-full border flex items-center justify-center transition-all select-none';
  const btnEnabled = 'border-white/15 text-white hover:border-teal-400/60 hover:bg-teal-400/10 active:scale-95';
  const btnDisabled = 'border-white/[0.07] text-white/25 cursor-not-allowed';

  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        data-lenis-prevent={nativeTrack ? '' : undefined}
        data-lenis-prevent-wheel={nativeTrack ? '' : undefined}
        data-lenis-prevent-touch={nativeTrack ? '' : undefined}
        style={{ touchAction: 'pan-x pan-y' }}
        className={`overflow-x-auto overflow-y-hidden py-[35px] md:py-0 snap-x snap-mandatory overscroll-x-contain scrollbar-hide cursor-grab active:cursor-grabbing md:cursor-default ${trackClassName}`}
      >
        {children}
      </div>
      <div className={`mt-3 flex items-center justify-end gap-2 ${arrowsClassName}`}>
        <button
          type="button"
          onClick={() => scrollDir(-1)}
          disabled={!canPrev}
          aria-label="Scorri indietro"
          className={`${baseBtn} ${canPrev ? btnEnabled : btnDisabled}`}
        >
          <TiaIcon icon={ArrowRight01Icon} size={17} className="-rotate-180" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => scrollDir(1)}
          disabled={!canNext}
          aria-label="Scorri avanti"
          className={`${baseBtn} ${canNext ? btnEnabled : btnDisabled}`}
        >
          <TiaIcon icon={ArrowRight01Icon} size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
