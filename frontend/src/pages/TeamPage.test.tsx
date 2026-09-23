import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TeamPage } from './TeamPage';
import { useAuthStore } from '@/features/auth/authStore';
import { SystemRole } from '@/features/auth/types';
import { TeamMember } from '@/features/team/services/team.service';

const MEMBERS: TeamMember[] = [
  { id: 'usr-admin-1', name: 'Ava Chen', email: 'admin@acmedata.io', role: 'owner', title: 'Workspace Owner', status: 'active' },
  { id: 'usr-bharath-1', name: 'Bharath', email: 'bharath@acmedata.io', role: 'admin', title: 'Workspace Admin', status: 'active' },
  { id: 'usr-eng-1', name: 'Maya Rodriguez', email: 'engineer@acmedata.io', role: 'member', title: 'Member', status: 'active' },
  { id: 'usr-view-1', name: 'Sam Okafor', email: 'analyst@acmedata.io', role: 'viewer', title: 'Viewer', status: 'active' },
];

vi.mock('@/features/team/services/team.service', async () => {
  const actual = await vi.importActual<typeof import('@/features/team/services/team.service')>(
    '@/features/team/services/team.service'
  );
  return {
    ...actual,
    teamService: {
      listMembers: vi.fn(async () => [...MEMBERS]),
      invite: vi.fn(async (email: string, role: string) => ({
        id: `usr-${Date.now()}`,
        name: email.split('@')[0],
        email,
        role,
        title: 'Viewer',
        status: 'invited',
      })),
      changeRole: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    },
    governanceService: {
      auditTrail: vi.fn(async () => []),
      pendingApprovals: vi.fn(async () => []),
    },
  };
});

function loginAs(role: SystemRole) {
  useAuthStore.setState({
    user: {
      id: 'usr-bharath-1',
      name: 'Bharath',
      email: 'bharath@acmedata.io',
      systemRole: role,
      roleTitle: 'Lead',
      status: 'online',
      workspaceName: 'Acme Data Platform',
    },
    token: 'test-token',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>
  );
}

describe('TeamPage', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  it('lists the workspace members from the real service', async () => {
    loginAs('viewer');
    renderPage();
    expect(await screen.findByText('Bharath')).toBeInTheDocument();
    expect(screen.getByText('Maya Rodriguez')).toBeInTheDocument();
    expect(screen.getByText('Ava Chen')).toBeInTheDocument();
  });

  it('shows an error state when the service fails', async () => {
    const { teamService } = await import('@/features/team/services/team.service');
    vi.mocked(teamService.listMembers).mockRejectedValueOnce(new Error('Backend unreachable'));
    loginAs('viewer');
    renderPage();
    expect(await screen.findByText(/Backend unreachable/i)).toBeInTheDocument();
  });

  it('shows an empty state when the workspace has no members', async () => {
    const { teamService } = await import('@/features/team/services/team.service');
    vi.mocked(teamService.listMembers).mockResolvedValueOnce([]);
    loginAs('viewer');
    renderPage();
    expect(await screen.findByText('No members yet')).toBeInTheDocument();
  });

  it('hides management controls from viewers (no team.manage)', async () => {
    loginAs('viewer');
    renderPage();
    await screen.findByText('Bharath');
    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/role for bharath/i)).not.toBeInTheDocument();
  });

  it('shows the invite button for leads (team.manage granted)', async () => {
    loginAs('lead');
    renderPage();
    await screen.findByText('Bharath');
    expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
  });

  it('invites a new member through the modal', async () => {
    const user = userEvent.setup();
    loginAs('lead');
    renderPage();
    await screen.findByText('Bharath');

    await user.click(screen.getByRole('button', { name: /invite member/i }));
    await user.type(screen.getByLabelText('Email address'), 'new.member@acmedata.io');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByText('new.member@acmedata.io')).toBeInTheDocument();
  });

  it('rejects an invite for an existing member without a network call', async () => {
    const user = userEvent.setup();
    const { teamService } = await import('@/features/team/services/team.service');
    loginAs('lead');
    renderPage();
    await screen.findByText('Bharath');

    await user.click(screen.getByRole('button', { name: /invite member/i }));
    await user.type(screen.getByLabelText('Email address'), 'bharath@acmedata.io');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByText('This person is already a member.')).toBeInTheDocument();
    expect(teamService.invite).not.toHaveBeenCalled();
  });

  it('prevents removing yourself', async () => {
    const user = userEvent.setup();
    loginAs('lead');
    renderPage();
    await screen.findByText('Bharath');

    // Bharath is signed in — self rows show no remove button
    expect(screen.queryByRole('button', { name: /remove bharath/i })).not.toBeInTheDocument();

    // But can remove others
    await user.click(screen.getByRole('button', { name: /remove maya rodriguez/i }));
    await waitFor(() => expect(screen.queryByText('Maya Rodriguez')).not.toBeInTheDocument());
  });
});
