import { create } from 'zustand';
import { User, NotificationItem } from '@/types/user';

interface AppState {
  currentUser: User;
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Schema Drift Detected',
    message: 'Table customer_orders in PostgreSQL changed structure (added column tax_amount_cents).',
    timestamp: '10 mins ago',
    type: 'warning',
    read: false,
    link: '/overview',
  },
  {
    id: 'notif-2',
    title: 'Auto-Healing Completed',
    message: 'inventory_sync pipeline auto-healed after checkpoint failure. Zero data loss.',
    timestamp: '45 mins ago',
    type: 'success',
    read: false,
    link: '/self-healing',
  },
  {
    id: 'notif-3',
    title: 'Kafka Consumer Lag Spike',
    message: 'fraud_stream_processor partition #3 lag exceeded 15,000 records threshold.',
    timestamp: '2 hours ago',
    type: 'error',
    read: true,
    link: '/monitoring',
  },
];

export const useAppStore = create<AppState>((set) => ({
  currentUser: {
    id: 'usr-bharath-1',
    name: 'Bharath',
    email: 'bharath@acmedata.io',
    role: 'Lead Data Engineer',
    status: 'online',
  },
  notifications: INITIAL_NOTIFICATIONS,

  markNotificationAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllNotificationsAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
