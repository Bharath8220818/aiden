import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';
import { AuthUser, AuthSession, SystemRole, ROLE_LABELS } from './types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  expiresAt: string | null;
  /** True between submit and service response */
  isAuthenticating: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<AuthUser>;
  /** Create an account (real backend or local demo identity) → auto-login on success. */
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  clearError: () => void;
}

/** Demo account directory — in production this comes from the backend identity provider. */
export const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
  'admin@acmedata.io': {
    password: 'admin123',
    user: {
      id: 'usr-admin-1',
      name: 'Ava Chen',
      email: 'admin@acmedata.io',
      systemRole: 'admin',
      roleTitle: 'Platform Admin',
      status: 'online',
      workspaceName: 'Acme Data Platform',
    },
  },
  'bharath@acmedata.io': {
    password: 'lead123',
    user: {
      id: 'usr-bharath-1',
      name: 'Bharath',
      email: 'bharath@acmedata.io',
      systemRole: 'lead',
      roleTitle: 'Lead Data Engineer',
      status: 'online',
      workspaceName: 'Acme Data Platform',
    },
  },
  'engineer@acmedata.io': {
    password: 'eng123',
    user: {
      id: 'usr-eng-1',
      name: 'Maya Rodriguez',
      email: 'engineer@acmedata.io',
      systemRole: 'engineer',
      roleTitle: 'Data Engineer',
      status: 'online',
      workspaceName: 'Acme Data Platform',
    },
  },
  'analyst@acmedata.io': {
    password: 'view123',
    user: {
      id: 'usr-view-1',
      name: 'Sam Okafor',
      email: 'analyst@acmedata.io',
      systemRole: 'viewer',
      roleTitle: 'Analytics Consumer',
      status: 'online',
      workspaceName: 'Acme Data Platform',
    },
  },
};

/** Simulated token expiry: 8 hours. */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      expiresAt: null,
      isAuthenticating: false,
      error: null,

      login: async (email, password) => {
        set({ isAuthenticating: true, error: null });

        // Real backend path (VITE_ENABLE_MOCK_DATA=false): POST /auth/login
        // returns the JWT session that the axios interceptor attaches.
        if (import.meta.env.VITE_ENABLE_MOCK_DATA === 'false') {
          try {
            const session = await api.post<AuthSession>('/auth/login', {
              email: email.trim().toLowerCase(),
              password,
            });
            set({
              user: session.user,
              token: session.token,
              expiresAt: session.expiresAt,
              isAuthenticating: false,
              error: null,
            });
            return session.user;
          } catch (err) {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Invalid email or password';
            set({ isAuthenticating: false, error: message });
            throw new Error('invalid_credentials');
          }
        }

        // Demo path (mock mode): simulated latency + local accounts
        await new Promise((r) => setTimeout(r, 650));

        const account = DEMO_ACCOUNTS[email.trim().toLowerCase()];
        if (!account || account.password !== password) {
          set({
            isAuthenticating: false,
            error: 'Invalid email or password.',
          });
          throw new Error('invalid_credentials');
        }

        const session: AuthSession = {
          user: account.user,
          token: `aiden.${btoa(account.user.id)}.${Date.now().toString(36)}`,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        };

        set({
          user: session.user,
          token: session.token,
          expiresAt: session.expiresAt,
          isAuthenticating: false,
          error: null,
        });
        return session.user;
      },

      register: async (name, email, password) => {
        set({ isAuthenticating: true, error: null });

        // Real backend path: open self-registration, then sign in with the
        // fresh credentials so the rest of the app sees a normal session.
        if (import.meta.env.VITE_ENABLE_MOCK_DATA === 'false') {
          try {
            await api.post('/users/register', {
              email: email.trim().toLowerCase(),
              password,
              full_name: name.trim(),
              role: 'engineer',
            });
          } catch (err) {
            const detail =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Could not create the account (email may already be registered).';
            set({ isAuthenticating: false, error: detail });
            throw new Error('registration_failed');
          }
          try {
            const user = await get().login(email, password);
            return user;
          } catch {
            // Account exists now but login failed — send the user to sign in.
            set({ isAuthenticating: false, error: null });
            throw new Error('Account created — please sign in.');
          }
        }

        // Demo path: create a local account backed by the shared mock identity
        // (same shape as the seeded accounts) so the rest of the app — RBAC,
        // workspace name, session TTL — behaves exactly like a real session.
        await new Promise((r) => setTimeout(r, 400));

        const normalized = email.trim().toLowerCase();
        if (DEMO_ACCOUNTS[normalized]) {
          set({
            isAuthenticating: false,
            error: 'That email belongs to a demo role — sign in with it on the Sign in tab instead.',
          });
          throw new Error('email_already_registered');
        }

        const role: SystemRole = 'engineer';
        const user: AuthUser = {
          id: `usr-local-${normalized.replace(/[^a-z0-9]/g, '-')}`,
          name: name.trim(),
          email: normalized,
          systemRole: role,
          roleTitle: ROLE_LABELS[role],
          status: 'online',
          workspaceName: `${name.trim().split(' ')[0] || 'My'} Workspace`,
        };
        DEMO_ACCOUNTS[normalized] = {
          password,
          user,
        };

        const session: AuthSession = {
          user,
          token: `aiden.${btoa(user.id)}.${Date.now().toString(36)}`,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        };
        set({
          user: session.user,
          token: session.token,
          expiresAt: session.expiresAt,
          isAuthenticating: false,
          error: null,
        });
        return session.user;
      },

      logout: () => set({ user: null, token: null, expiresAt: null, error: null }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'aiden-auth',
      partialize: (state) => ({ user: state.user, token: state.token, expiresAt: state.expiresAt }),
    }
  )
);

/** Convenience selector: does the signed-in user hold this system role (or higher-rank roles pass explicitly)? */
export function selectSystemRole(): SystemRole | null {
  return useAuthStore.getState().user?.systemRole ?? null;
}

/** True when a session exists and has not expired. */
export function selectIsSessionValid(): boolean {
  const { user, expiresAt } = useAuthStore.getState();
  if (!user || !expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}
