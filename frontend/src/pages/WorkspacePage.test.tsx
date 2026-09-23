import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import WorkspacePage from './WorkspacePage';
import * as workspaceService from '@/features/workspace/services/workspace.service';

vi.mock('@/features/workspace/services/workspace.service');

const mockedSend = vi.mocked(workspaceService.sendWorkspaceMessage);

// The Integration Registry pulls three auxiliary endpoints; stub them all.
beforeEach(() => {
  vi.mocked(workspaceService.fetchChannelStatus).mockResolvedValue({
    internal: { enabled: true, mode: 'durable + websocket' },
    email: { enabled: false, mode: 'smtp' },
    slack: { enabled: false, mode: 'incoming-webhook' },
    teams: { enabled: false, mode: 'power-automate-webhook' },
  });
  vi.mocked(workspaceService.fetchConnectionSummaries).mockResolvedValue([
    { id: 'conn-1', name: 'PostgreSQL — Production', providerName: 'PostgreSQL', status: 'connected', database: 'orders' },
  ]);
  vi.mocked(workspaceService.fetchWorkspaceTools).mockResolvedValue([
    { name: 'db.introspect', description: 'List tables', category: 'database', permission: 'connection.read', risk: 'low' },
  ]);
});

describe('WorkspacePage', () => {
  it('renders the universal input and welcome message', () => {
    render(
      <MemoryRouter>
        <WorkspacePage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('workspace-input')).toBeInTheDocument();
    expect(screen.getByText(/I'm AIDEN/i)).toBeInTheDocument();
  });

  it('sends a message and renders the reply with artifact cards', async () => {
    mockedSend.mockResolvedValueOnce({
      reply: 'I sketched a sales pipeline (extract → validate → transform → load).',
      intent: 'pipeline',
      artifacts: [
        {
          type: 'pipeline',
          title: 'Sales pipeline',
          stages: ['extract', 'validate', 'transform', 'load'],
          actions: ['build', 'run'],
        },
      ],
      context: { projectId: null },
      suggestions: ['Design the architecture'],
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WorkspacePage />
      </MemoryRouter>
    );

    await user.type(screen.getByTestId('workspace-input'), 'Create a sales pipeline{Enter}');
    await waitFor(() => expect(screen.getByTestId('artifact-card')).toBeInTheDocument());
    expect(screen.getByText(/sketched a sales pipeline/i)).toBeInTheDocument();
    expect(screen.getByText('Build Pipeline')).toBeInTheDocument();
  });

  it('shows the integration registry with connections and channels', async () => {
    render(
      <MemoryRouter>
        <WorkspacePage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('integration-registry')).toBeInTheDocument());
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('db.introspect')).toBeInTheDocument();
  });

  it('renders the context panel after a response', async () => {
    mockedSend.mockResolvedValueOnce({
      reply: 'Here is the current context.',
      intent: 'monitoring',
      artifacts: [],
      context: {
        projectName: 'Sales ETL',
        pipelines: [{ id: 'p1', name: 'orders_daily', status: 'active' }],
        incidents: [{ id: 'i1', title: 'Schema drift', severity: 'high', status: 'detected' }],
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WorkspacePage />
      </MemoryRouter>
    );

    await user.type(screen.getByTestId('workspace-input'), 'platform status{Enter}');
    await waitFor(() => expect(screen.getByTestId('context-panel')).toBeInTheDocument());
    expect(screen.getByText('Sales ETL')).toBeInTheDocument();
    expect(screen.getByText('orders_daily')).toBeInTheDocument();
  });
});
