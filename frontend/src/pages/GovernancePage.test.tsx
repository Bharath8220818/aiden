import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GovernancePage } from './GovernancePage';
import { useAuthStore, DEMO_ACCOUNTS } from '@/features/auth/authStore';
import { SystemRole } from '@/features/auth/types';

function loginAs(role: SystemRole) {
  const account = Object.values(DEMO_ACCOUNTS).find((a) => a.user.systemRole === role)!;
  useAuthStore.setState({
    user: account.user,
    token: 'test-token',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GovernancePage />
    </MemoryRouter>
  );
}

describe('GovernancePage', () => {
  beforeEach(() => useAuthStore.getState().logout());

  it('renders the permission matrix with all four role columns', () => {
    loginAs('viewer');
    renderPage();
    expect(screen.getByText('Permission Matrix')).toBeInTheDocument();
    for (const role of ['Viewer', 'Engineer', 'Lead', 'Admin']) {
      expect(screen.getByRole('columnheader', { name: role })).toBeInTheDocument();
    }
  });

  it('shows the dangerous operations section with the approval policy', () => {
    loginAs('viewer');
    renderPage();
    expect(screen.getByText('Dangerous Operations')).toBeInTheDocument();
    expect(screen.getByText('Production deployment')).toBeInTheDocument();
    expect(screen.getByText(/approval before execution/i)).toBeInTheDocument();
  });

  it('notes read-only mode for viewers (no approvals.decide)', () => {
    loginAs('viewer');
    renderPage();
    expect(screen.getByText(/read-only view/i)).toBeInTheDocument();
  });

  it('hides the read-only note for admins (approvals.decide granted)', () => {
    loginAs('admin');
    renderPage();
    expect(screen.queryByText(/read-only view/i)).not.toBeInTheDocument();
  });
});
