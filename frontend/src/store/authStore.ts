import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AppUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface AuthState {
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getSession: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  login: (credentials: { email?: string; username?: string; password: string }) => Promise<void>;
  signup: (data: { email: string; password: string; full_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const toAppUser = (user: SupabaseUser | null | undefined): AppUser | null => {
  if (!user) return null;

  const displayName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name
      : user.email || 'User';

  return {
    id: user.id,
    email: user.email || '',
    username: user.email || user.id,
    full_name: displayName,
    is_active: true,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at,
  };
};

const setAuthToken = (session: Session | null) => {
  if (session?.access_token) {
    localStorage.setItem('auth_token', session.access_token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,

  signUp: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setAuthToken(data.session);
      set({
        user: toAppUser(data.user),
        session: data.session,
        isAuthenticated: Boolean(data.session || data.user),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthToken(data.session);
      set({
        user: toAppUser(data.user),
        session: data.session,
        isAuthenticated: Boolean(data.session),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    setAuthToken(null);
    set({ user: null, session: null, isAuthenticated: false });
  },

  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    setAuthToken(data.session);
    set({
      session: data.session,
      user: toAppUser(data.session?.user),
      isAuthenticated: Boolean(data.session),
    });
  },

  getCurrentUser: async () => {
    await get().getSession();
  },

  login: async ({ email, username, password }) => {
    await get().signIn(email || username || '', password);
  },

  signup: async ({ email, password, full_name }) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: full_name ? { data: { full_name } } : undefined,
      });
      if (error) throw error;
      setAuthToken(data.session);
      set({
        user: toAppUser(data.user),
        session: data.session,
        isAuthenticated: Boolean(data.session || data.user),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await get().signOut();
  },
}));
