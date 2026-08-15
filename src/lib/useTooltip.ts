'use client';

import { useRef, useCallback, useEffect } from 'react';

interface UseTooltipOptions {
  showDelay?: number;
  hideDelay?: number;
}

interface TooltipHandlers {
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
}

// Max movement (CSS px) between pointerdown and pointerup for a gesture to
// count as a tap. Beyond this it's a drag/scroll — even on browsers that
// don't fire pointercancel reliably, a scroll started on the trigger must
// never open (or close) the tooltip.
const TAP_SLOP = 12;

/**
 * useTooltip — incapsula la logica di show/hide con delay per tooltip.
 *
 * Desktop: hover (pointerenter/pointerleave) con delay.
 * Mobile: tap sul trigger → il tooltip appare subito con feedback aptico
 * (navigator.vibrate, dove supportato); un secondo tap sullo stesso trigger
 * oppure un tap fuori lo nasconde.
 *
 * @param onShow  Callback chiamato con (testo, elemento DOM) quando il tooltip deve apparire.
 * @param onHide  Callback chiamato quando il tooltip deve scomparire.
 * @param options Opzionale: showDelay (default 300ms), hideDelay (default 100ms).
 *
 * @returns { getHandlers }
 *   - getHandlers(text) → { onPointerEnter, onPointerLeave, onPointerUp } per un trigger specifico.
 */
export function useTooltip(
  onShow: (text: string, el: HTMLElement) => void,
  onHide: () => void,
  options: UseTooltipOptions = {}
) {
  const { showDelay = 300, hideDelay = 100 } = options;
  const hideTmrRef = useRef<number | null>(null);
  // Trigger currently shown by a touch tap: a second tap on it (or a tap
  // anywhere else) dismisses the tooltip. Only used on touch — on desktop
  // hover alone manages show/hide.
  const activeElRef = useRef<HTMLElement | null>(null);

  // Tap outside the active trigger (touch only) hides the tooltip. Mouse
  // clicks are handled by hover, so pointer events of type 'mouse' are ignored
  // here — otherwise every mouse click anywhere would dismiss tooltips the
  // instant before a hover re-shows them.
  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Tapping the trigger itself is handled by its onPointerUp (toggle).
      if (activeElRef.current && activeElRef.current.contains(target)) return;
      activeElRef.current = null;
      onHide();
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [onHide]);

  const hideWithDelay = useCallback(() => {
    if (hideTmrRef.current) clearTimeout(hideTmrRef.current);
    hideTmrRef.current = window.setTimeout(onHide, hideDelay);
  }, [onHide, hideDelay]);

  const cancelHide = useCallback(() => {
    if (hideTmrRef.current) {
      clearTimeout(hideTmrRef.current);
      hideTmrRef.current = null;
    }
  }, []);

  /**
   * getHandlers restituisce gli event handlers per un trigger specifico.
   *
   * - onPointerEnter (solo mouse): annulla l'hide pendente, avvia un timer
   *   showDelay per mostrare il tooltip. I touch non attivano mai l'hover:
   *   il tap è gestito da onPointerUp, così su mobile il tooltip non appare
   *   e scompare subito per colpa della coppia enter/leave.
   * - onPointerLeave (solo mouse): cancella il timer show, avvia un timer
   *   hideDelay per nascondere il tooltip.
   * - onPointerUp (solo touch): toggle tap — se il tooltip di QUESTO trigger
   *   è già visibile lo chiude, altrimenti lo apre subito con feedback aptico.
   */
  const getHandlers = useCallback(
    (text: string): TooltipHandlers => ({
      onPointerEnter(e) {
        if (e.pointerType !== 'mouse') return;
        const el = e.currentTarget as HTMLElement;
        cancelHide();
        const timeout = window.setTimeout(() => {
          onShow(text, el);
        }, showDelay);
        el.dataset.tooltipTimeout = String(timeout);
      },
      onPointerLeave(e) {
        if (e.pointerType !== 'mouse') return;
        const el = e.currentTarget as HTMLElement;
        const showTmr = Number(el.dataset.tooltipTimeout);
        if (showTmr) clearTimeout(showTmr);
        activeElRef.current = null;
        hideWithDelay();
      },
      onPointerDown(e) {
        if (e.pointerType !== 'touch') return;
        // Remember where the gesture started so pointerup can tell a real tap
        // from a drag/scroll (see TAP_SLOP).
        const el = e.currentTarget as HTMLElement;
        el.dataset.tipDownX = String(e.clientX);
        el.dataset.tipDownY = String(e.clientY);
      },
      onPointerUp(e) {
        if (e.pointerType !== 'touch') return;
        const el = e.currentTarget as HTMLElement;
        const dx = e.clientX - Number(el.dataset.tipDownX ?? e.clientX);
        const dy = e.clientY - Number(el.dataset.tipDownY ?? e.clientY);
        delete el.dataset.tipDownX;
        delete el.dataset.tipDownY;
        // Dragged (scroll gesture) → never toggle; the browser's pointercancel
        // already handled the scroll, this is a belt-and-braces guard.
        if (Math.hypot(dx, dy) > TAP_SLOP) return;
        if (activeElRef.current === el) {
          activeElRef.current = null;
          onHide();
          return;
        }
        activeElRef.current = el;
        navigator.vibrate?.(10);
        onShow(text, el);
      },
    }),
    [cancelHide, hideWithDelay, onShow, showDelay]
  );

  return { getHandlers };
}
