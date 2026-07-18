import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';
import type { User, LoginCredentials, SignupData } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: localStorage.getItem('auth_token'),
      isAuthenticated: !!localStorage.getItem('auth_token'),
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          localStorage.setItem('auth_token', response.access_token);
          set({ token: response.access_token, isAuthenticated: true });
          await get().getCurrentUser();
        } catch (error: any) {
          set({ error: error.response?.data?.detail || 'Login failed' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (data: SignupData) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.signup(data);
          // Auto-login after signup
          await get().login({ username: data.username, password: data.password });
        } catch (error: any) {
          set({ error: error.response?.data?.detail || 'Signup failed' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      getCurrentUser: async () => {
        try {
          const user = await authApi.getCurrentUser();
          set({ user });
        } catch (error) {
          set({ error: 'Failed to get user' });
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