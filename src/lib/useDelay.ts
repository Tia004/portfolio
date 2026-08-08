'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * One-shot delayed execution with automatic cleanup on unmount.
 * The callback is always fresh (read from a ref), so you don't need
 * to include it in the dependency array.
 *
 * @example
 *   const { start, cancel } = useDelay(onTooltipHide, 100);
 *   <button onMouseEnter={() => show()} onMouseLeave={() => start()} />
 */
export function useDelay(
  callback: () => void,
  delayMs: number,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  /** Schedule the callback after `delayMs`. Cancels any pending timer first. */
  const start = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      cbRef.current();
    }, delayMs);
  }, [delayMs]);

  /** Cancel any pending timer. Safe to call multiple times. */
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Returns true if a timer is currently pending. */
  const isPending = useCallback(() => timerRef.current !== null, []);

  // Auto-cleanup on unmount
  useEffect(() => cancel, [cancel]);

  return { start, cancel, isPending };
}
