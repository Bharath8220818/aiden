import { api } from '@/services/api';
import { LoginCredentials, AuthSession } from './types';
import { useAuthStore } from './authStore';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    if (!isMockEnabled()) {
      return api.post<AuthSession>('/auth/login', credentials);
    }
    // Mock path delegates to the persisted zustand store (demo accounts)
    const store = useAuthStore.getState();
    const user = await store.login(credentials.email, credentials.password);
    return {
      user,
      token: useAuthStore.getState().token ?? '',
      expiresAt: useAuthStore.getState().expiresAt ?? '',
    };
  },

  async logout(): Promise<void> {
    if (!isMockEnabled()) {
      await api.post('/auth/logout');
    }
    useAuthStore.getState().logout();
  },
};
