'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener?.('change', onChange);
  return () => mql.removeEventListener?.('change', onChange);
}

/**
 * Live `prefers-reduced-motion`. The server (and the first hydration pass)
 * assume motion is fine, then React re-renders with the real value, so there
 * is never a hydration mismatch.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(QUERY).matches,
    () => false,
  );
}
