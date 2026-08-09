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
  // scroll-snap-type is disabled while dragging (it would fight the manual
  // scrollLeft) and restored on release so the track settles on the
  // nearest card. A drag of >5px suppresses the click that follows the
  // pointerup (otherwise releasing over a card would open its modal).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let drag: { startX: number; startLeft: number; moved: number } | null = null;
    let suppressClick = false;

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      el.scrollLeft = drag.startLeft - dx;
    };
    const onUp = () => {
      if (!drag) return;
      if (drag.moved > 5) suppressClick = true;
      drag = null;
      el.style.scrollSnapType = '';
      el.style.userSelect = '';
      el.classList.remove('cursor-grabbing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth + 1) return; // not scrollable
      drag = { startX: e.clientX, startLeft: el.scrollLeft, moved: 0 };
      suppressClick = false;
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

  // ── Mouse-wheel support (narrow desktop windows, <768px) ──────
  // React's onWheel is attached passively, so preventDefault() wouldn't
  // work there — attach a native non-passive listener instead. Lenis
  // listens for 'wheel' on window and does NOT respect preventDefault, so
  // when the slider consumes the wheel we stopPropagation() to keep Lenis
  // from also scrolling the page. At a boundary (scrollLeft unchanged) we
  // let the event bubble through: Lenis then scrolls the page smoothly,
  // exactly as if the wheel happened over a normal section.
  //
  // Deltas are accumulated; every ~30px of wheel movement advances the
  // track by EXACTLY one card. Landing on a snap position means
  // scroll-snap-mandatory never fights the programmatic scroll (a raw
  // pixel scroll would snap straight back to the previous card) and the
  // track never "springs back" when the wheel stops.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      // Desktop layout: the track is a CSS grid with overflow-visible,
      // not scrollable — the page must scroll untouched.
      if (el.scrollWidth <= el.clientWidth + 1) return;
      let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      if (e.deltaMode === 1) delta *= 16; // Firefox lines → px
      else if (e.deltaMode === 2) delta *= window.innerHeight; // pages → px

      // Boundary in the wheel's direction → the page owns the wheel
      // (Lenis keeps it smooth). The reverse direction still moves the
      // carousel back, not the page.
      const max = el.scrollWidth - el.clientWidth;
      if (delta > 0 ? el.scrollLeft >= max - 4 : el.scrollLeft <= 4) return;

      // The carousel owns the wheel while it can move: consume every event
      // — even sub-threshold ones, so slow trackpad swipes accumulate here
      // instead of also scrolling the page (double-scroll).
      e.preventDefault();
      e.stopPropagation();

      acc += delta;
      if (Math.abs(acc) < 30) return; // keep accumulating
      const dir = acc > 0 ? 1 : -1;
      acc = 0;
      const first = el.firstElementChild as HTMLElement | null;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const step = first ? first.offsetWidth + gap : el.clientWidth * 0.85;
      // One snap step — lands exactly on a snap position, so
      // scroll-snap-mandatory never fights the programmatic scroll.
      el.scrollBy({ left: dir * step });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scrollDir = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = first ? first.offsetWidth + gap : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  const baseBtn = 'h-9 w-9 rounded-full border flex items-center justify-center transition-all select-none';
  const btnEnabled = 'border-white/15 text-white hover:border-teal-400/60 hover:bg-teal-400/10 active:scale-95';
  const btnDisabled = 'border-white/[0.07] text-white/25 cursor-not-allowed';

  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        className={`overflow-x-auto overflow-y-hidden py-[35px] md:py-0 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing md:cursor-default ${trackClassName}`}
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
          <TiaIcon icon={ArrowRight01Icon} size={15} className="-rotate-180" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => scrollDir(1)}
          disabled={!canNext}
          aria-label="Scorri avanti"
          className={`${baseBtn} ${canNext ? btnEnabled : btnDisabled}`}
        >
          <TiaIcon icon={ArrowRight01Icon} size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
