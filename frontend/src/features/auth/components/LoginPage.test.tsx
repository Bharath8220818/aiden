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

  it('renders email and password fields with no demo-role shortcuts', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // The one-tap demo roles are gone — the card only offers real credentials.
    expect(screen.queryByText('Bharath')).not.toBeInTheDocument();
    expect(screen.queryByText('Ava Chen')).not.toBeInTheDocument();
    expect(screen.queryByText(/one-tap demo roles/i)).not.toBeInTheDocument();
    // No credentials are prefilled.
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
    expect(screen.getByLabelText(/password/i)).toHaveValue('');
  });

  it('keeps the session empty when the form is submitted empty', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in to aiden/i }));

    // HTML5 validation blocks the submit — no session, no alert.
    expect(useAuthStore.getState().user).toBeNull();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });

  it('shows an error for invalid credentials and keeps the session empty', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'bharath@acmedata.io');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in to aiden/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });
    expect(useAuthStore.getState().user).toBeNull();
  });
});
