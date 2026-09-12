import { api } from './api';
import { User } from '@/types/user';

export const authService = {
  async getCurrentUser(): Promise<User> {
    try {
      return await api.get<User>('/auth/me');
    } catch {
      // Fallback user for Phase 1
      return {
        id: 'usr-bharath-1',
        name: 'Bharath',
        email: 'bharath@acmedata.io',
        role: 'Lead Data Engineer',
        status: 'online',
      };
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('aiden_auth_token');
  },
};
