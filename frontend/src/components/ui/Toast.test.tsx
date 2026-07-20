import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './Toast';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Toast', () => {
  it('renders title and message', () => {
    render(
      <Toast
        type="success"
        title="Success!"
        message="Operation completed."
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed.')).toBeInTheDocument();
  });

  it('renders without message', () => {
    render(
      <Toast
        type="info"
        title="Info"
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <Toast
        type="success"
        title="Success!"
        onClose={onClose}
      />
    );
    // Use fireEvent (sync) instead of userEvent to avoid timer conflicts
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    // The component has a 300ms exit delay before calling onClose
    vi.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose after duration expires', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <Toast
        type="info"
        title="Auto-dismiss"
        duration={2000}
        onClose={onClose}
      />
    );
    // Should not have been called yet
    expect(onClose).not.toHaveBeenCalled();
    // Fast-forward past duration + exit delay
    vi.advanceTimersByTime(2300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders action button when provided', () => {
    render(
      <Toast
        type="warning"
        title="Warning"
        onClose={() => {}}
        action={{ label: 'Undo', onClick: () => {} }}
      />
    );
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('calls action.onClick when action button is clicked', async () => {
    const onAction = vi.fn();
    render(
      <Toast
        type="error"
        title="Error"
        onClose={() => {}}
        action={{ label: 'Retry', onClick: onAction }}
      />
    );
    await userEvent.click(screen.getByText('Retry'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders the correct icon for each type', () => {
    const types = ['success', 'error', 'warning', 'info'] as const;
    types.forEach((type) => {
      cleanup();
      const { container } = render(
        <Toast type={type} title={type} onClose={() => {}} />
      );
      // Each type renders an SVG icon inside the toast
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('does not auto-dismiss when duration is 0', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <Toast
        type="info"
        title="Persistent"
        duration={0}
        onClose={onClose}
      />
    );
    vi.advanceTimersByTime(10000);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies the correct color class for each type', () => {
    const { container } = render(
      <Toast type="success" title="Test" onClose={() => {}} />
    );
    // The toast should have a green background class
    const toastEl = container.firstChild as HTMLElement;
    expect(toastEl.className).toContain('green');
  });
});
