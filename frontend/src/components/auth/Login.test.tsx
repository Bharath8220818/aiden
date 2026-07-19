import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './Login';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

describe('Login Component', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, session: null, isAuthenticated: false, isLoading: false });
    localStorage.clear();
  });

  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('displays validation errors for empty fields', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(await screen.findByText(/Please enter a valid email/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
  });

  it('does not render the demo shortcut', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.queryByRole('button', { name: /Use demo account/i })).not.toBeInTheDocument();
  });
});