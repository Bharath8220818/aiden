import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, AlertTriangle, Trophy, ArrowRight, Sparkles } from 'lucide-react';

interface AiInsight {
  id: string;
  type: 'improvement' | 'warning' | 'achievement';
  title: string;
  description: string;
  metric: string;
  action: string;
  actionLabel: string;
}

interface AIInsightCardProps {
  insight: AiInsight;
  onAction: (action: string) => void;
  delay?: number;
}

const typeConfig = {
  improvement: {
    icon: Lightbulb,
    gradient: 'from-cyan-600 to-cyan-500',
    shadow: 'shadow-cyan-500/30',
    badge: 'badge-cyan',
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/5',
    accent: 'bg-cyan-500',
  },
  warning: {
    icon: AlertTriangle,
    gradient: 'from-amber-500 to-amber-400',
    shadow: 'shadow-amber-400/30',
    badge: 'badge-warning',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    accent: 'bg-amber-500',
  },
  achievement: {
    icon: Trophy,
    gradient: 'from-green-600 to-green-500',
    shadow: 'shadow-green-500/30',
    badge: 'badge-success',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    accent: 'bg-green-500',
  },
};

const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight, onAction, delay = 0 }) => {
  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-5 transition-all duration-200 hover:shadow-glow-purple`}
    >
      <div className={`absolute left-0 top-0 h-full w-0.5 ${config.accent}`} />

      <div className="flex items-start gap-4 pl-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg ${config.shadow}`}>
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
            <span className={config.badge}>{insight.metric}</span>
          </div>
          <p className="mt-1 text-sm text-gray-400 leading-relaxed">{insight.description}</p>
          <button
            onClick={() => onAction(insight.action)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
          >
            <Sparkles size={12} />
            {insight.actionLabel}
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AIInsightCard;
