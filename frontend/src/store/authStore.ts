import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api';
import type { User } from '../types/auth';

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('auth_token');
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    username: string;
    email: string;
    full_name: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: getStoredToken(),
      isAuthenticated: !!getStoredToken(),
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          params.append('username', email);
          params.append('password', password);

          const response = await api.post('/api/v1/auth/login', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });

          const token = response.data.access_token;
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
          }

          set({ token, isAuthenticated: true });
          await get().getCurrentUser();
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Login failed';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/v1/auth/signup', {
            username: data.username,
            email: data.email,
            full_name: data.full_name,
            password: data.password,
          });

          await get().login(data.email, data.password);
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Signup failed';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }

        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      getCurrentUser: async () => {
        try {
          const response = await api.get('/api/v1/auth/me');
          set({ user: response.data });
        } catch {
          get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
