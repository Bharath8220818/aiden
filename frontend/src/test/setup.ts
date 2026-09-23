import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useAuthStore } from '@/features/auth/authStore';

afterEach(() => {
  cleanup();
  // Reset auth session between tests so store state never leaks
  useAuthStore.getState().logout();
  useAuthStore.getState().clearError();
  window.localStorage.clear();
});
