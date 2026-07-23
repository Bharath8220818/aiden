import { useState, useEffect, useRef } from 'react';

export interface UseCounterOptions {
  end: number;
  start?: number;
  duration?: number;
  decimals?: number;
  enabled?: boolean;
}

export function useCounter({
  end,
  start = 0,
  duration = 1000,
  decimals = 0,
  enabled = true,
}: UseCounterOptions) {
  const [count, setCount] = useState(start);
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setCount(end);
      return;
    }

    setCount(start);
    startTimeRef.current = undefined; // Reset start time on re-trigger

    const animate = (timestamp: number) => {
      if (startTimeRef.current === undefined) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out quartic
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * eased;

      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, start, duration, enabled]);

  const formatted = Number(count.toFixed(decimals)).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return { count: Math.round(count), formatted, raw: count };
}
