import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Clock, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { EmptyState } from '../components/ui/EmptyState';

type NotifFilter = 'all' | 'unread' | 'success' | 'warning' | 'error' | 'info';

const typeIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-green-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  error: <AlertCircle size={16} className="text-red-500" />,
  info: <Info size={16} className="text-blue-500" />,
};

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotificationStore();
  const [filter, setFilter] = useState<NotifFilter>('all');

  // Seed some notifications if empty
  useEffect(() => {
    const store = useNotificationStore.getState();
    if (store.notifications.length === 0) {
      store.addNotification({ type: 'success', title: 'Pipeline Completed', message: 'Daily Sales ETL completed successfully. Processed 12,500 records in 4.2 min.' });
      store.addNotification({ type: 'error', title: 'Pipeline Failure', message: 'IoT Stream Pipeline failed after 3 retries. Connection timeout to Kafka broker.', duration: 10000 });
      store.addNotification({ type: 'warning', title: 'Data Quality Alert', message: 'Null rate in "email" field exceeded 5% threshold (actual: 8.3%).' });
      store.addNotification({ type: 'info', title: 'Scheduled Maintenance', message: 'Pipelines will be paused 02:00–03:00 UTC for database upgrade.' });
      store.addNotification({ type: 'success', title: 'Schema Update Approved', message: 'New column "order_discount" mapped to Snowflake target.' });
      store.addNotification({ type: 'info', title: 'New Integration Available', message: 'Datadog integration is now available. Connect in Settings.', duration: 0 });
    }
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Activity
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Notification Center
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <CheckCheck size={14} />
              Mark All Read
            </button>
          )}
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 dark:border-red-900/50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="flex flex-wrap items-center gap-3">
        {([
          { key: 'all', label: 'All', count: notifications.length, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
          { key: 'unread', label: 'Unread', count: unreadCount, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
          { key: 'success', label: 'Success', count: notifications.filter((n) => n.type === 'success').length, color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
          { key: 'error', label: 'Errors', count: notifications.filter((n) => n.type === 'error').length, color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
          { key: 'warning', label: 'Warnings', count: notifications.filter((n) => n.type === 'warning').length, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
          { key: 'info', label: 'Info', count: notifications.filter((n) => n.type === 'info').length, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as NotifFilter)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === tab.key ? `${tab.color} ring-2 ring-offset-1` : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              tab.key === 'all' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
              tab.key === 'unread' ? 'bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : ''
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Notification List ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="No notifications"
            description={filter === 'all' ? 'No notifications yet. They will appear here when something happens.' : 'No notifications match this filter.'}
            icon={<Bell size={32} className="text-gray-400" />}
            size="md"
          />
        ) : (
          filtered.map((notif) => (
            <div
              key={notif.id}
              className={`group rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-gray-900/60 dark:border-gray-700 ${
                !notif.read ? 'border-l-4 border-l-purple-500 ring-1 ring-purple-500/10' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  notif.type === 'success' ? 'bg-green-100 dark:bg-green-950/30' :
                  notif.type === 'error' ? 'bg-red-100 dark:bg-red-950/30' :
                  notif.type === 'warning' ? 'bg-amber-100 dark:bg-amber-950/30' :
                  'bg-blue-100 dark:bg-blue-950/30'
                }`}>
                  {typeIcons[notif.type] || <Info size={16} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {notif.title || (notif.type.charAt(0).toUpperCase() + notif.type.slice(1))}
                      </p>
                      {notif.message && (
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{notif.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-purple-600 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-purple-400"
                          title="Mark as read"
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(notif.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-red-400"
                        title="Dismiss"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{getTimeAgo(notif.timestamp)}</span>
                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ${
                      notif.type === 'success' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30' :
                      notif.type === 'error' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30' :
                      notif.type === 'warning' ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30' :
                      'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30'
                    }`}>
                      {notif.type}
                    </span>
                    <span className="text-[10px] text-gray-400">{notif.read ? 'Read' : 'New'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
