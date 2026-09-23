import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center space-x-1 border-b border-border pb-px overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-card/50 rounded-t-md'
            )}
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 text-[10px] font-semibold rounded-full',
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-600'
                    : 'bg-card-active text-text-secondary'
                )}
              >
                {tab.badge}
              </span>
            )}

            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-ai-glow"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
