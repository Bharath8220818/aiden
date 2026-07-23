import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Variant = 'purple' | 'green' | 'cyan' | 'amber' | 'red';

interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

interface MetricsKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  trend?: TrendData;
  variant: Variant;
  delay?: number;
}

const variantStyles: Record<Variant, { gradient: string; shadow: string }> = {
  purple: { gradient: 'from-purple-600 to-purple-500', shadow: 'shadow-purple-500/30' },
  green: { gradient: 'from-green-600 to-green-500', shadow: 'shadow-green-500/30' },
  cyan: { gradient: 'from-cyan-600 to-cyan-500', shadow: 'shadow-cyan-500/30' },
  amber: { gradient: 'from-amber-500 to-amber-400', shadow: 'shadow-amber-400/30' },
  red: { gradient: 'from-red-600 to-red-500', shadow: 'shadow-red-500/30' },
};

const AnimatedValue: React.FC<{ value: number; duration?: number }> = ({ value, duration = 600 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = 0;
    const delta = value - from;

    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + delta * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
};

const MetricsKpiCard: React.FC<MetricsKpiCardProps> = ({
  title, value, icon, sub, trend, variant, delay = 0,
}) => {
  const styles = variantStyles[variant];

  const TrendIcon = trend?.direction === 'up' ? TrendingUp
    : trend?.direction === 'down' ? TrendingDown
    : Minus;

  const trendColor = trend?.direction === 'up' ? 'text-green-400'
    : trend?.direction === 'down' ? 'text-red-400'
    : 'text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="glass-card p-5 transition-all duration-300 hover:border-purple-500/30 hover:shadow-glow-purple hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white truncate">
            {typeof value === 'number' ? <AnimatedValue value={value} /> : value}
          </p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${styles.gradient} text-white shadow-lg ${styles.shadow}`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-white/5">
          <TrendIcon size={14} className={trendColor} />
          <span className={`text-sm font-semibold ${trendColor}`}>{trend.value}</span>
          <span className="text-xs text-gray-500 ml-auto">vs last period</span>
        </div>
      )}
    </motion.div>
  );
};

export default MetricsKpiCard;
