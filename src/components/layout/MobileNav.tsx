import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { Sidebar } from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Activity,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileNav: React.FC = () => {
  const { isMobileNavOpen, closeMobileNav, openAskAiden } = useUIStore();

  const mobileTabs = [
    { label: 'Overview', path: '/overview', icon: LayoutDashboard },
    { label: 'Pipelines', path: '/pipelines', icon: GitBranch },
    { label: 'Ask AIDEN', action: openAskAiden, icon: Sparkles, isAi: true },
    { label: 'Monitoring', path: '/monitoring', icon: Activity },
    { label: 'Self-Healing', path: '/self-healing', icon: Cpu },
  ];

  return (
    <>
      {/* Slide-out mobile drawer */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileNav}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[85vw] h-full z-10"
            >
              <Sidebar isMobileDrawer className="w-full h-full shadow-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile bottom persistent tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0F1115] border-t border-[#242831] z-20 flex items-center justify-around px-2 pb-safe">
        {mobileTabs.map((tab, idx) => {
          const Icon = tab.icon;
          if (tab.action) {
            return (
              <button
                key={idx}
                onClick={tab.action}
                className="flex flex-col items-center justify-center text-[10px] text-indigo-400 font-medium py-1 px-2"
              >
                <div className="p-1 rounded-full bg-indigo-500/20 shadow-ai-glow">
                  <Icon className="w-4 h-4 text-cyan-300" />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={idx}
              to={tab.path!}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center text-[10px] font-medium py-1 px-2 transition-colors',
                  isActive
                    ? 'text-indigo-400 font-semibold'
                    : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
                )
              }
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
};
