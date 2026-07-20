import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';
import type { User } from '../types/auth';

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
      token: localStorage.getItem('auth_token'),
      isAuthenticated: !!localStorage.getItem('auth_token'),
      isLoading: false,
      error: null,

      // ── LOGIN ──
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({
            username: email, // Backend expects 'username' field
            password,
          });

          const token = response.access_token;
          localStorage.setItem('auth_token', token);
          set({ token, isAuthenticated: true, isLoading: false });
          await get().getCurrentUser();
        } catch (error: any) {
          const message =
            error.response?.data?.detail || 'Login failed. Please check your credentials.';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      // ── SIGNUP ──
      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.signup({
            username: data.username,
            email: data.email,
            full_name: data.full_name,
            password: data.password,
          });

          // Auto-login after successful signup
          await get().login(data.email, data.password);
        } catch (error: any) {
          const message =
            error.response?.data?.detail || 'Signup failed. Please try again.';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      // ── LOGOUT ──
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      // ── GET CURRENT USER ──
      getCurrentUser: async () => {
        try {
          const user = await authApi.getCurrentUser();
          set({ user });
        } catch {
          // Token invalid — clear auth state
          get().logout();
        }
      },

      // ── CLEAR ERROR ──
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
