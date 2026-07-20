import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders with label', () => {
    render(
      <Toggle checked={false} onChange={() => {}} label="Dark Mode" />
    );
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <Toggle
        checked={false}
        onChange={() => {}}
        label="Notifications"
        description="Receive email alerts"
      />
    );
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Receive email alerts')).toBeInTheDocument();
  });

  it('renders without label or description', () => {
    const { container } = render(
      <Toggle checked={false} onChange={() => {}} />
    );
    const label = container.querySelector('label');
    expect(label).toBeInTheDocument();
  });

  it('calls onChange with true when toggled from unchecked', async () => {
    const onChange = vi.fn();
    render(
      <Toggle checked={false} onChange={onChange} label="Toggle me" />
    );
    await userEvent.click(screen.getByText('Toggle me'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when toggled from checked', async () => {
    const onChange = vi.fn();
    render(
      <Toggle checked={true} onChange={onChange} label="Toggle me" />
    );
    await userEvent.click(screen.getByText('Toggle me'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('has the correct aria label on the hidden input', () => {
    render(
      <Toggle checked={false} onChange={() => {}} label="Enable feature" />
    );
    const input = screen.getByLabelText('Enable feature');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'checkbox');
  });

  it('has the hidden input checked when checked is true', () => {
    render(
      <Toggle checked={true} onChange={() => {}} label="Checked" />
    );
    const input = screen.getByLabelText('Checked') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it('has the hidden input unchecked when checked is false', () => {
    render(
      <Toggle checked={false} onChange={() => {}} label="Unchecked" />
    );
    const input = screen.getByLabelText('Unchecked') as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn();
    render(
      <Toggle checked={false} onChange={onChange} label="Disabled" disabled={true} />
    );
    await userEvent.click(screen.getByText('Disabled'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies disabled styles', () => {
    const { container } = render(
      <Toggle checked={false} onChange={() => {}} label="Disabled" disabled={true} />
    );
    const label = container.querySelector('label');
    expect(label?.className).toContain('opacity-50');
  });

  it('renders with sm size', () => {
    const { container } = render(
      <Toggle checked={false} onChange={() => {}} size="sm" />
    );
    const track = container.querySelector('.w-8');
    expect(track).toBeInTheDocument();
  });

  it('renders with md size (default)', () => {
    const { container } = render(
      <Toggle checked={false} onChange={() => {}} size="md" />
    );
    const track = container.querySelector('.w-11');
    expect(track).toBeInTheDocument();
  });

  it('applies blue background when checked', () => {
    const { container } = render(
      <Toggle checked={true} onChange={() => {}} />
    );
    const track = container.querySelector('.bg-blue-600');
    expect(track).toBeInTheDocument();
  });

  it('applies gray background when unchecked', () => {
    const { container } = render(
      <Toggle checked={false} onChange={() => {}} />
    );
    const track = container.querySelector('.bg-gray-300');
    expect(track).toBeInTheDocument();
  });
});
