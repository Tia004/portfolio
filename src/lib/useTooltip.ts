'use client';

import { useRef, useCallback } from 'react';

interface UseTooltipOptions {
  showDelay?: number;
  hideDelay?: number;
}

interface TooltipHandlers {
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
}

/**
 * useTooltip — incapsula la logica di show/hide con delay per tooltip.
 *
 * @param onShow  Callback chiamato con (testo, elemento DOM) quando il tooltip deve apparire.
 * @param onHide  Callback chiamato quando il tooltip deve scomparire.
 * @param options Opzionale: showDelay (default 300ms), hideDelay (default 100ms).
 *
 * @returns { getHandlers, cancelHide }
 *   - getHandlers(text) → { onPointerEnter, onPointerLeave } handlers per un trigger specifico.
 *   - cancelHide()      Annulla un hide pendente (utile per spostamenti tra trigger).
 */
export function useTooltip(
  onShow: (text: string, el: HTMLElement) => void,
  onHide: () => void,
  options: UseTooltipOptions = {}
) {
  const { showDelay = 300, hideDelay = 100 } = options;
  const hideTmrRef = useRef<number | null>(null);

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
   * - onPointerEnter: annulla l'hide pendente, avvia un timer showDelay per mostrare il tooltip.
   * - onPointerLeave: cancella il timer show, avvia un timer hideDelay per nascondere il tooltip.
   */
  const getHandlers = useCallback(
    (text: string): TooltipHandlers => ({
      onPointerEnter(e) {
        const el = e.currentTarget as HTMLElement;
        cancelHide();
        const timeout = window.setTimeout(() => {
          onShow(text, el);
        }, showDelay);
        el.dataset.tooltipTimeout = String(timeout);
      },
      onPointerLeave(e) {
        const el = e.currentTarget as HTMLElement;
        const showTmr = Number(el.dataset.tooltipTimeout);
        if (showTmr) clearTimeout(showTmr);
        hideWithDelay();
      },
    }),
    [cancelHide, hideWithDelay, onShow, showDelay]
  );

  return { getHandlers, cancelHide };
}
