import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '../authStore';

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('renders email and password fields with demo accounts', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText('Bharath')).toBeInTheDocument();
    expect(screen.getByText('Ava Chen')).toBeInTheDocument();
  });

  it('signs in with prefilled demo credentials', async () => {
    const user = userEvent.setup();

    renderLogin();
    await user.click(screen.getByRole('button', { name: /^sign in to aiden$/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.systemRole).toBe('lead');
    });
  });

  it('quick-fills credentials when a demo account is clicked', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByText('Sam Okafor'));

    expect(screen.getByLabelText(/email/i)).toHaveValue('analyst@acmedata.io');
    expect(screen.getByLabelText(/password/i)).toHaveValue('view123');
  });

  it('shows an error for invalid credentials and keeps the session empty', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'bharath@acmedata.io');
    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /^sign in to aiden$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
    });
    expect(useAuthStore.getState().user).toBeNull();
  });
});
