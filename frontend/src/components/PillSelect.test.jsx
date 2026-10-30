import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PillSelect from './PillSelect.jsx';

const options = [
  { value: '2026-10', label: 'October 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-08', label: 'August 2026' }
];

describe('PillSelect', () => {
  it('shows the selected option\'s label on the trigger, not the raw value', () => {
    render(<PillSelect value="2026-10" onChange={() => {}} options={options} />);
    expect(screen.getByRole('button', { name: /October 2026/i })).toBeInTheDocument();
  });

  it('opens the menu on click and lists every option', async () => {
    const user = userEvent.setup();
    render(<PillSelect value="2026-10" onChange={() => {}} options={options} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('calls onChange with the picked option\'s value and closes the menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PillSelect value="2026-10" onChange={onChange} options={options} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: /September 2026/i }));

    expect(onChange).toHaveBeenCalledWith('2026-09');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the menu when clicking outside it', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <PillSelect value="2026-10" onChange={() => {}} options={options} />
        <button>outside</button>
      </div>
    );

    await user.click(screen.getByRole('button', { name: /October 2026/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the menu on Escape', async () => {
    const user = userEvent.setup();
    render(<PillSelect value="2026-10" onChange={() => {}} options={options} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the menu and selects with ArrowDown + Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PillSelect value="2026-10" onChange={onChange} options={options} />);

    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}'); // opens, highlighting the selected option (October)
    await user.keyboard('{ArrowDown}'); // moves to September
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('2026-09');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks a disabled option as aria-disabled and skips it in onChange/keyboard nav', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const withDisabled = [
      { value: '2026-10', label: 'October 2026' },
      { value: '2026-11', label: 'November 2026', disabled: true },
      { value: '2026-12', label: 'December 2026', disabled: true }
    ];
    render(<PillSelect value="2026-10" onChange={onChange} options={withDisabled} />);

    await user.click(screen.getByRole('button'));
    const novemberOption = screen.getByRole('option', { name: /November 2026/i });
    expect(novemberOption).toHaveAttribute('aria-disabled', 'true');

    await user.click(novemberOption);
    expect(onChange).not.toHaveBeenCalled();

    // ArrowDown from October should skip both disabled months and wrap back to October.
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('2026-10');
  });
});
