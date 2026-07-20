import React from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { Toast } from '../ui/Toast';

export const ToastProvider: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast
            type={n.type}
            title={n.title || (n.type === 'success' ? 'Success' : n.type === 'error' ? 'Error' : n.type === 'warning' ? 'Warning' : 'Info')}
            message={n.message}
            duration={n.duration || 5000}
            onClose={() => removeNotification(n.id)}
          />
        </div>
      ))}
    </div>
  );
};

ToastProvider.displayName = 'ToastProvider';
