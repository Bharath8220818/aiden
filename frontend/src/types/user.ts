export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'Lead Data Engineer' | 'Data Architect' | 'Data Engineer' | 'Platform Admin';
  status: 'online' | 'busy' | 'away' | 'offline';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  link?: string;
}
