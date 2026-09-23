import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Radio, Wifi, WifiOff, Sparkles, HeartPulse, AlertTriangle, CheckCircle2, Info, Zap } from 'lucide-react';
import { liveEvents$, LiveEvent } from '@/services/liveEvents';
import { useAppStore } from '@/store/appStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<LiveEvent['type'], React.ReactNode> = {
  incident: <AlertTriangle className="w-4 h-4 text-red-600" />,
  healing: <HeartPulse className="w-4 h-4 text-emerald-600" />,
  pipeline: <Zap className="w-4 h-4 text-indigo-600" />,
  insight: <Sparkles className="w-4 h-4 text-cyan-600" />,
  info: <Info className="w-4 h-4 text-text-secondary" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
};

const TYPE_COLOR: Record<LiveEvent['type'], string> = {
  incident: 'border-red-500/40',
  healing: 'border-emerald-500/40',
  pipeline: 'border-indigo-500/40',
  insight: 'border-cyan-500/40',
  info: 'border-border-highlight',
  success: 'border-emerald-500/40',
};

const TOAST_DURATION_MS = 7000;

export const LiveEventToasts: React.FC = () => {
  const [toasts, setToasts] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const addNotification = useAppStore((s) => s.addNotification);
  const isAskAidenOpen = useUIStore((s) => s.isAskAidenOpen);
  const isCommandPaletteOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const isNotificationDrawerOpen = useUIStore((s) => s.isNotificationDrawerOpen);

  useEffect(() => {
    // Buffer while modal overlays are open to avoid stealing attention
    let paused = isAskAidenOpen || isCommandPaletteOpen || isNotificationDrawerOpen;
    const interval = setInterval(() => {
      paused = useUIStore.getState().isAskAidenOpen
        || useUIStore.getState().isCommandPaletteOpen
        || useUIStore.getState().isNotificationDrawerOpen;
    }, 400);

    const sub = liveEvents$.subscribe((event) => {
      setIsConnected(true);
      // Mirror into the persistent notification center
      addNotification({
        title: event.title,
        message: event.message,
        type: event.type === 'incident' ? 'error' : event.type === 'healing' || event.type === 'success' ? 'success' : event.type === 'insight' ? 'info' : 'warning',
        link: event.link,
      });
      if (!paused) {
        setToasts((prev) => {
          // Same event can be replayed (reconnects, subject re-emit) — never
          // stack the same toast twice.
          if (prev.some((t) => t.id === event.id)) return prev;
          return [event, ...prev].slice(0, 4);
        });
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== event.id));
        }, TOAST_DURATION_MS);
      }
    });

    return () => {
      sub.unsubscribe();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {/* Connection status pill */}
      <div
        className={cn(
          'fixed bottom-4 right-4 z-[60] hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono backdrop-blur-md transition-colors',
          isConnected
            ? 'bg-card/90 border-emerald-500/30 text-emerald-600'
            : 'bg-card/90 border-border-highlight text-text-muted'
        )}
        role="status"
        aria-live="polite"
      >
        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isConnected ? 'live · realtime' : 'connecting…'}
      </div>

      {/* Toast stack */}
      <div className="fixed top-16 right-4 z-[70] space-y-2 w-[340px] max-w-[calc(100vw-2rem)]" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className={cn(
                'p-3 rounded-lg bg-card/95 backdrop-blur-md border shadow-elevated toast-in',
                TYPE_COLOR[toast.type]
              )}
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{TYPE_ICON[toast.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold text-text-primary truncate">{toast.title}</p>
                    <span className="text-[9px] font-mono text-text-muted ml-auto flex items-center gap-1 shrink-0">
                      <Radio className="w-2.5 h-2.5" />
                      live
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-snug mt-0.5">{toast.message}</p>
                  {toast.link && (
                    <Link
                      to={toast.link}
                      onClick={() => dismiss(toast.id)}
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-600 mt-1.5 transition-colors"
                    >
                      View details <ArrowRight />
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-card-active transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Auto-dismiss progress bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: TOAST_DURATION_MS / 1000, ease: 'linear' }}
                className="h-0.5 rounded-full bg-indigo-500/60 mt-2"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

function ArrowRight() {
  return <span aria-hidden="true">→</span>;
}
