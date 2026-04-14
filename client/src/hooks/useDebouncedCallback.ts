/**
 * useDebouncedCallback — Debounce a callback by a given delay.
 *
 * Replaces the pattern of manually creating a debounceRef + setTimeout
 * in every component that needs debounced input handling.
 *
 * Usage:
 *   const debouncedSave = useDebouncedCallback((value: string) => {
 *     api.put('/api/thing', { value });
 *   }, 400);
 *
 *   <input onChange={(e) => debouncedSave(e.target.value)} />
 */

import { useRef, useCallback, useEffect } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delayMs: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(callback);

  // Always use the latest callback without resetting the timer
  callbackRef.current = callback;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    }) as T,
    [delayMs]
  );
}
