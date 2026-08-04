import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://whjstcclxklikppvvwfr.supabase.co';
// Supabase renamed the "anon key" to "publishable key" in 2025 — accept both
// names so the app works regardless of which one is set in .env.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sign in with GitHub via Supabase OAuth.
 * Redirects the user to GitHub for authorization.
 */
export const signInWithGitHub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Sign up with email via Supabase.
 */
export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Sign in with email via Supabase.
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/**
 * Exchange Supabase session for a backend JWT.
 */
export const exchangeToken = async (supabaseAccessToken: string) => {
  const response = await fetch('/api/v1/auth/supabase/exchange-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supabase_access_token: supabaseAccessToken }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Token exchange failed');
  }
  return response.json();
};

/**
 * Sign out from Supabase.
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
