import { useEffect, useRef } from 'react';

/**
 * Find the nearest scrollable ancestor (the element that actually scrolls
 * the target) — falls back to the window.
 */
const scrollParentOf = (el: HTMLElement): HTMLElement | Window => {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(overflowY)) return parent;
    parent = parent.parentElement;
  }
  return window;
};

/**
 * Reveal check: an element should be visible once its top edge is above the
 * viewport bottom — this also covers elements the user has ALREADY scrolled
 * past (instant anchor jumps, fast flicks, restored scroll positions), which
 * a pure IntersectionObserver misses because they never intersect.
 */
const shouldReveal = (el: HTMLElement, viewportBottom: number): boolean => {
  const rect = el.getBoundingClientRect();
  const bottom = viewportBottom ?? window.innerHeight;
  return rect.top < bottom - 30; // 30px early-trigger margin
};

const collect = (container: HTMLElement | null): HTMLElement[] =>
  container
    ? Array.from(container.querySelectorAll<HTMLElement>('.reveal'))
    : [];

/**
 * Scroll-reveal for a container's `.reveal` children with staggered delays.
 * Listens on the actual scroll parent (AppShell's #main-content or window),
 * so it works for nested scrolling panes; anything already above the fold
 * reveals immediately.
 *
 * `deps` re-attaches when late-mounted content renders (async data, etc.).
 */
export function useStaggerReveal<T extends HTMLElement>(baseDelayMs = 70, deps: unknown[] = []) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = collect(container);
    if (children.length === 0) return;

    children.forEach((child, i) => {
      if (!child.classList.contains('reveal-in')) {
        child.style.transitionDelay = `${i * baseDelayMs}ms`;
      }
    });

    const scroller = scrollParentOf(container);

    const check = () => {
      const viewportBottom =
        scroller instanceof Window ? window.innerHeight : scroller.getBoundingClientRect().bottom;
      children.forEach((child) => {
        if (!child.classList.contains('reveal-in') && shouldReveal(child, viewportBottom)) {
          child.classList.add('reveal-in');
        }
      });
      // All revealed → stop listening.
      if (children.every((c) => c.classList.contains('reveal-in'))) {
        target.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };

    const onScroll = () => requestAnimationFrame(check);

    const target: HTMLElement | Window = scroller;
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial pass: reveals everything at/above the fold right away.
    check();

    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDelayMs, ...deps]);

  return containerRef;
}

/**
 * Single-element scroll reveal — same semantics as useStaggerReveal but for
 * one node (no stagger). Re-reveals never fire; once is permanent.
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15, deps: unknown[] = []) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scroller = scrollParentOf(el);

    const check = () => {
      const viewportBottom =
        scroller instanceof Window ? window.innerHeight : scroller.getBoundingClientRect().bottom;
      if (shouldReveal(el, viewportBottom)) {
        el.classList.add('reveal-in');
        target.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };

    const onScroll = () => requestAnimationFrame(check);
    const target: HTMLElement | Window = scroller;

    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    check();

    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold, ...deps]);

  return ref;
}
