import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, DEMO_ACCOUNTS } from './authStore';

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('starts signed out', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('signs in a valid demo account and sets an 8h session', async () => {
    const user = await useAuthStore.getState().login('bharath@acmedata.io', 'lead123');
    const state = useAuthStore.getState();

    expect(user.systemRole).toBe('lead');
    expect(state.user?.name).toBe('Bharath');
    expect(state.token).toMatch(/^aiden\./);

    const ttl = new Date(state.expiresAt!).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(7.9 * 60 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(8 * 60 * 60 * 1000);
  });

  it('normalizes email casing on login', async () => {
    await useAuthStore.getState().login('  ADMIN@ACMEDATA.IO ', 'admin123');
    expect(useAuthStore.getState().user?.systemRole).toBe('admin');
  });

  it('rejects a wrong password without setting a session', async () => {
    await expect(useAuthStore.getState().login('bharath@acmedata.io', 'nope')).rejects.toThrow();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.error).toContain('Invalid email or password');
    expect(state.isAuthenticating).toBe(false);
  });

  it('rejects an unknown email', async () => {
    await expect(useAuthStore.getState().login('intruder@evil.io', 'x')).rejects.toThrow();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears the session on logout', async () => {
    await useAuthStore.getState().login('analyst@acmedata.io', 'view123');
    expect(useAuthStore.getState().user).not.toBeNull();

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('ships one demo account per system role', () => {
    const roles = Object.values(DEMO_ACCOUNTS).map((a) => a.user.systemRole).sort();
    expect(roles).toEqual(['admin', 'engineer', 'lead', 'viewer']);
  });

  it('clears error state via clearError', async () => {
    await expect(useAuthStore.getState().login('bharath@acmedata.io', 'bad')).rejects.toThrow();
    expect(useAuthStore.getState().error).not.toBeNull();

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('completes login within a simulated latency window', async () => {
    vi.useFakeTimers();
    const promise = useAuthStore.getState().login('engineer@acmedata.io', 'eng123');
    vi.advanceTimersByTime(700);
    await promise;
    vi.useRealTimers();
    expect(useAuthStore.getState().user?.systemRole).toBe('engineer');
  });
});
