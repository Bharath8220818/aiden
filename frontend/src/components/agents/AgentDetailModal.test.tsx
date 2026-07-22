import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAgentStore } from '../../store/agentStore';
import AgentDetailModal from './AgentDetailModal';

const mockAgent = {
  name: 'Intent Parser',
  role: 'Natural Language Understanding',
  icon: '🧠',
  status: 'running' as const,
  tasksCompleted: 12580,
  cpuUsage: 32,
  memoryUsage: '1.2 GB',
  currentTask: 'Parsing user request',
  uptime: '14d 6h',
  description: 'Understanding your request',
  logs: ['14:32:01 — Parsed intent'],
};

describe('AgentDetailModal', () => {
  beforeEach(() => {
    useAgentStore.getState().selectAgent(null);
  });

  it('renders nothing when no agent is selected', () => {
    const { container } = render(<AgentDetailModal />);
    expect(container.innerHTML).toBe('');
  });

  it('renders agent details when an agent is selected', () => {
    useAgentStore.getState().selectAgent(mockAgent as any);
    render(<AgentDetailModal />);
    expect(screen.getByText('Intent Parser')).toBeTruthy();
    expect(screen.getByText('12,580')).toBeTruthy();
    // "32%" appears twice: in the CPU metric tile and the CPU Load label
    const cpuMatches = screen.getAllByText(/32\s*%?/);
    expect(cpuMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('closes when clicking the close button', () => {
    useAgentStore.getState().selectAgent(mockAgent as any);
    render(<AgentDetailModal />);
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    expect(useAgentStore.getState().selectedAgent).toBeNull();
  });
});
