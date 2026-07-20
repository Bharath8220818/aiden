import { useState, useRef, useCallback, useEffect } from 'react';

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = useRef(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const isRefreshingRef = useRef(false);

  // Keep onRefresh in a ref so the effect doesn't depend on it
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling.current || isRefreshingRef.current) return;

      const diff = e.touches[0].clientY - startY.current;

      if (diff > 0) {
        // Add resistance — the further you pull, the harder it gets
        const distance = Math.min(diff * 0.5, 120);
        pullDistanceRef.current = distance;
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistanceRef.current >= threshold && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(threshold);

        try {
          await onRefreshRef.current();
        } catch (error) {
          console.error('Pull-to-refresh failed:', error);
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, threshold]);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    pullDistanceRef.current = threshold;
    setPullDistance(threshold);
    try {
      await onRefreshRef.current();
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [threshold]);

  return {
    isRefreshing,
    pullDistance,
    refresh,
  };
}
