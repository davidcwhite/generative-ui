import { useEffect, useState } from 'react';

/**
 * Tracks the user's `prefers-reduced-motion` setting (Web Interface Guidelines:
 * honour reduced motion). Self-contained so the folder ports without pulling a
 * project hook. SSR-safe: returns `false` until mounted.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
