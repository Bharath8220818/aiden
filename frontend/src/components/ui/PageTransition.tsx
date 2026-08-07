import React from 'react';
import { motion, type Variants } from 'framer-motion';

export type PageTransitionVariant =
  | 'fade'
  | 'slide'
  | 'slideUp'
  | 'scale'
  | 'slideX'
  | 'rotate';

export interface PageTransitionProps {
  children: React.ReactNode;
  /** Which page-enter/exit animation to use. Defaults to 'slideUp'. */
  variant?: PageTransitionVariant;
  className?: string;
}

const easeOut = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const easeIn = [0.55, 0, 0.55, 0.2] as [number, number, number, number];

const variantMap: Record<PageTransitionVariant, Variants> = {
  // Simple opacity crossfade — good for dense, content-heavy pages.
  fade: {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 0.3, ease: easeOut } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: easeIn } },
  },
  // Fade + vertical drift (classic stacked-card feel).
  slide: {
    initial: { opacity: 0, y: 20 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: easeOut } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: easeIn } },
  },
  // Subtle rise — the default. Barely perceptible, keeps scroll context.
  slideUp: {
    initial: { opacity: 0, y: 12 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: easeIn } },
  },
  // Fade + scale — feels like zooming into a canvas/designer.
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    enter: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: easeOut } },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: easeIn } },
  },
  // Horizontal drift — nice for drilling into a detail page.
  slideX: {
    initial: { opacity: 0, x: -30 },
    enter: { opacity: 1, x: 0, transition: { duration: 0.3, ease: easeOut } },
    exit: { opacity: 0, x: 30, transition: { duration: 0.2, ease: easeIn } },
  },
  // Subtle tilt — playful, use sparingly.
  rotate: {
    initial: { opacity: 0, rotate: -3, scale: 0.985 },
    enter: { opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.35, ease: easeOut } },
    exit: { opacity: 0, rotate: 3, scale: 0.985, transition: { duration: 0.25, ease: easeIn } },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  variant = 'slideUp',
  className,
}) => {
  const variants = variantMap[variant] ?? variantMap.slideUp;

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

PageTransition.displayName = 'PageTransition';
