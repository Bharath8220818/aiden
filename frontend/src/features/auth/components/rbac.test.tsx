import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PermissionGate, ForbiddenPage } from './RouteGuards';
import { useAuthStore, DEMO_ACCOUNTS } from '../authStore';
import { SystemRole } from '../types';

function loginAs(role: SystemRole) {
  const account = Object.values(DEMO_ACCOUNTS).find((a) => a.user.systemRole === role)!;
  useAuthStore.setState({
    user: account.user,
    token: 'test-token',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
}

describe('PermissionGate', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('renders children when the role holds the permission', () => {
    loginAs('lead');
    render(
      <MemoryRouter>
        <PermissionGate permission="pipelines.deploy">
          <button>Deploy now</button>
        </PermissionGate>
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /deploy now/i })).toBeInTheDocument();
  });

  it('renders the fallback when the role lacks the permission', () => {
    loginAs('viewer');
    render(
      <MemoryRouter>
        <PermissionGate permission="pipelines.deploy" fallback={<span>read-only</span>}>
          <button>Deploy now</button>
        </PermissionGate>
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /deploy now/i })).not.toBeInTheDocument();
    expect(screen.getByText('read-only')).toBeInTheDocument();
  });

  it('renders nothing without a fallback when permission is missing', () => {
    loginAs('engineer');
    render(
      <MemoryRouter>
        <PermissionGate permission="agents.control">
          <button>Pause agent</button>
        </PermissionGate>
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /pause agent/i })).not.toBeInTheDocument();
  });

  it('shows a 403 page naming the role and permission', () => {
    loginAs('viewer');
    render(
      <MemoryRouter>
        <ForbiddenPage permission="healing.approve" />
      </MemoryRouter>
    );
    expect(screen.getByText('Access restricted')).toBeInTheDocument();
    expect(screen.getByText('Analyst (Read-only)')).toBeInTheDocument();
    expect(screen.getByText(/healing\.approve/)).toBeInTheDocument();
  });
});
