import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-route window-scroll memory for SPA navigation.
 *
 * React Router's declarative `<BrowserRouter>` does NOT manage scroll
 * restoration. Between two tall pages the browser keeps scrollY "by
 * accident"; but navigating to a short / fixed-height page (like the
 * Pipeline Builder's full-viewport workbench) makes the document stop
 * overflowing, so the browser clamps scrollY to 0 — the "jump to top".
 *
 * This hook:
 *  - disables the browser's native scroll restoration (we own it),
 *  - saves each route's scrollY the moment you leave it (the old page is
 *    still mounted during the exit animation, so the value is accurate),
 *  - tracks scroll while a page is settled,
 *  - returns `restoreScroll()` to call after the page transition completes
 *    (AnimatePresence `onExitComplete`), so the incoming page gets its saved
 *    position — or keeps the current position on a first visit.
 */
const STORAGE_KEY = 'aiden-scroll-restoration';

// Per-path scroll cache, backed by sessionStorage so a full page reload (F5)
// still restores the position the browser would otherwise have lost once we
// set history.scrollRestoration = 'manual'.
const scrollCache: Map<string, number> = (() => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return new Map(raw ? (JSON.parse(raw) as [string, number][]) : []);
  } catch {
    return new Map();
  }
})();

function persistCache() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...scrollCache.entries()]));
  } catch {
    // Storage full/unavailable — cache stays in-memory only.
  }
}

export function useScrollRestoration() {
  const location = useLocation();
  const pathKey = location.pathname + location.search;
  const pathKeyRef = useRef(pathKey);
  const transitioningRef = useRef(false);

  // We handle restoration — stop the browser from fighting us on back/forward.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Restore on initial mount (e.g. a full page reload) for a path we have
  // previously cached — onExitComplete never fires for the first render, so
  // this is what actually applies the sessionStorage-restored position.
  useLayoutEffect(() => {
    const saved = scrollCache.get(pathKeyRef.current);
    if (saved !== undefined) {
      window.scrollTo(0, saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
  }, []);

  // Route changed: remember where we were on the page we're leaving. This runs
  // during the exit animation, while the outgoing page is still in the DOM.
  useEffect(() => {
    const prev = pathKeyRef.current;
    if (prev !== pathKey) {
      scrollCache.set(prev, window.scrollY);
      persistCache();
      pathKeyRef.current = pathKey;
      transitioningRef.current = true;
    }
  }, [pathKey]);

  // Track scroll only for a settled page — never mid-transition, so we don't
  // stamp the outgoing page's scroll onto the incoming route's cache entry.
  // sessionStorage writes are throttled so frequent scroll events don't jank.
  useEffect(() => {
    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    const schedulePersist = () => {
      if (persistTimer) return;
      persistTimer = setTimeout(() => {
        persistTimer = null;
        persistCache();
      }, 300);
    };
    const onScroll = () => {
      if (!transitioningRef.current) {
        scrollCache.set(pathKeyRef.current, window.scrollY);
        schedulePersist();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onPageHide = () => persistCache();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
      if (persistTimer) clearTimeout(persistTimer);
    };
  }, []);

  // Call from AnimatePresence's onExitComplete: the new page is mounted now,
  // so restoring here lands on the correct document height (no clamp glitch).
  const restoreScroll = useCallback(() => {
    const target = pathKeyRef.current;
    transitioningRef.current = false;
    const saved = scrollCache.get(target);
    if (saved === undefined) return; // first visit: keep native behavior
    window.scrollTo(0, saved);
  }, []);

  return { restoreScroll };
}
