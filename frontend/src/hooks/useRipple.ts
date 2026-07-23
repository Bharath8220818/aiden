import { useEffect, useRef } from 'react';

export function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Set up element once for ripple positioning
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }
    if (computedStyle.overflow !== 'hidden') {
      element.style.overflow = 'hidden';
    }

    const handleClick = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();

      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      ripple.className = 'ripple-effect';
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.3)';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'rippleAnim 0.6s ease-out';
      ripple.style.pointerEvents = 'none';
      ripple.style.overflow = 'hidden';

      element.appendChild(ripple);

      const cleanup = () => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      };

      ripple.addEventListener('animationend', cleanup);
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }, []);

  return ref;
}
