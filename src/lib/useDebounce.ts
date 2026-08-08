'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * Debounce a callback so it only fires after `delay` ms of inactivity.
 * The returned function has stable identity across re-renders (the underlying
 * callback is read from a ref, so it's always fresh).
 *
 * @example
 *   const debouncedSearch = useDebounce((q: string) => fetchResults(q), 300);
 *   <input onChange={e => debouncedSearch(e.target.value)} />
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef<T>(callback);
  cbRef.current = callback;

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        cbRef.current(...args);
      }, delay);
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced as T;
}
