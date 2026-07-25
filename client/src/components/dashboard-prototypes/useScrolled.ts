import { useEffect, useRef, useState } from 'react';

/**
 * True once the nearest dashboard scroll container has moved. A white bar on a
 * white page has no edge at rest, so the hairline is earned by scrolling.
 */
export function useScrolled() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const scroller = node.closest('[data-dashboard-scroll]');
    const target: HTMLElement | Window = scroller instanceof HTMLElement ? scroller : window;
    const read = () =>
      setScrolled((target instanceof Window ? window.scrollY : target.scrollTop) > 2);

    read();
    target.addEventListener('scroll', read, { passive: true });
    return () => target.removeEventListener('scroll', read);
  }, []);

  return { ref, scrolled };
}
