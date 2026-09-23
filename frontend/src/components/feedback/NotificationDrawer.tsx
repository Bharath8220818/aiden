import React, { useRef, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useAppStore } from '@/store/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const NotificationDrawer: React.FC = () => {
  const { isNotificationDrawerOpen, closeNotificationDrawer } = useUIStore();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAppStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        closeNotificationDrawer();
      }
    };
    if (isNotificationDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationDrawerOpen, closeNotificationDrawer]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconMap = {
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };

  const colorMap = {
    warning: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    success: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    error: 'text-red-600 bg-red-500/10 border-red-500/20',
    info: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <AnimatePresence>
      {isNotificationDrawerOpen && (
        <motion.div
          ref={drawerRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-600">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = iconMap[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationAsRead(n.id);
                      if (n.link) {
                        navigate(n.link);
                        closeNotificationDrawer();
                      }
                    }}
                    className={cn(
                      'p-3.5 flex items-start gap-3 hover:bg-card-hover/70 transition-colors cursor-pointer text-left',
                      !n.read && 'bg-border'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5',
                        colorMap[n.type]
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={cn('text-xs font-medium truncate', !n.read ? 'text-text-primary font-semibold' : 'text-text-secondary')}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-text-muted whitespace-nowrap">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-card border-t border-border text-center">
            <span className="text-[11px] text-text-muted">
              AIDEN Autonomous Alert Stream
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
