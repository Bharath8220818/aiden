import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from './Dropdown';

afterEach(() => {
  cleanup();
});

describe('Dropdown', () => {
  it('renders the trigger element', () => {
    render(
      <Dropdown
        trigger={<button>Menu</button>}
        items={[{ label: 'Item', onClick: () => {} }]}
      />
    );
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('shows menu items when trigger is clicked', async () => {
    render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[
          { label: 'Profile', onClick: () => {} },
          { label: 'Settings', onClick: () => {} },
        ]}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('hides menu when Escape key is pressed', async () => {
    render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[{ label: 'Item', onClick: () => {} }]}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Item')).toBeInTheDocument();

    // Flush effects before dispatching
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    });
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
  });

  it('hides menu when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <Dropdown
          trigger={<button>Open</button>}
          items={[{ label: 'Item', onClick: () => {} }]}
        />
      </div>
    );
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Item')).toBeInTheDocument();

    // Flush effects before dispatching
    act(() => {
      fireEvent.mouseDown(screen.getByTestId('outside'));
    });
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
  });

  it('calls onClick when an item is clicked', async () => {
    const onClick = vi.fn();
    render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[{ label: 'Profile', onClick }]}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    await userEvent.click(screen.getByText('Profile'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders divider when divider prop is true', async () => {
    render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[
          { label: 'Item 1', onClick: () => {} },
          { label: 'Divider', onClick: () => {}, divider: true },
          { label: 'Item 2', onClick: () => {} },
        ]}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    // Divider should render as a horizontal rule element
    const hr = document.querySelector('.my-1.border-t');
    expect(hr).toBeInTheDocument();
  });

  it('disables items when disabled prop is true', async () => {
    render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[
          { label: 'Enabled', onClick: () => {} },
          { label: 'Disabled', onClick: () => {}, disabled: true },
        ]}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    const disabledBtn = screen.getByText('Disabled').closest('button');
    expect(disabledBtn).toBeDisabled();
  });

  it('disabled items do not call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[
          { label: 'Disabled', onClick, disabled: true },
        ]}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    await userEvent.click(screen.getByText('Disabled'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies danger class to danger item buttons', async () => {
    render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[{ label: 'Delete', onClick: () => {}, danger: true }]}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    // getByText returns the <span> inside the button, so climb to <button>
    const deleteBtn = screen.getByText('Delete').closest('button');
    expect(deleteBtn?.className).toContain('text-red-600');
  });

  it('renders with align="right"', async () => {
    const { container } = render(
      <Dropdown
        trigger={<button>Open</button>}
        items={[{ label: 'Item', onClick: () => {} }]}
        align="right"
      />
    );
    await userEvent.click(screen.getByText('Open'));
    const menu = container.querySelector('.right-0');
    expect(menu).toBeInTheDocument();
  });
});
