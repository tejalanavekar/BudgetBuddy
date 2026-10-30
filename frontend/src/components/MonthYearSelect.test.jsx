import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthYearSelect from './MonthYearSelect.jsx';

// Fixed "now" so this test suite never depends on the real clock.
const NOW = new Date(2026, 4, 15); // May 15, 2026

describe('MonthYearSelect', () => {
  it('shows the month name and year from the "YYYY-MM" value', () => {
    render(<MonthYearSelect value="2026-03" onChange={() => {}} now={NOW} />);
    expect(screen.getByRole('button', { name: 'Select month' })).toHaveTextContent('March');
    expect(screen.getByRole('button', { name: 'Select year' })).toHaveTextContent('2026');
  });

  it('calls onChange with the new "YYYY-MM" when a past month is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthYearSelect value="2026-05" onChange={onChange} now={NOW} />);

    await user.click(screen.getByRole('button', { name: 'Select month' }));
    await user.click(screen.getByRole('option', { name: 'January' }));

    expect(onChange).toHaveBeenCalledWith('2026-01');
  });

  it('disables months after the current one when the current year is selected', async () => {
    const user = userEvent.setup();
    render(<MonthYearSelect value="2026-05" onChange={() => {}} now={NOW} />);

    await user.click(screen.getByRole('button', { name: 'Select month' }));
    expect(screen.getByRole('option', { name: 'June' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: /May/ })).not.toHaveAttribute('aria-disabled');
  });

  it('enables every month when a past year is selected', async () => {
    const user = userEvent.setup();
    render(<MonthYearSelect value="2025-05" onChange={() => {}} now={NOW} />);

    await user.click(screen.getByRole('button', { name: 'Select month' }));
    expect(screen.getByRole('option', { name: 'December' })).not.toHaveAttribute('aria-disabled');
  });

  it('snaps the month to the current one when switching back to the current year with a future month selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Starting selection: December of a past year (a month number that would be
    // "in the future" for the current year).
    render(<MonthYearSelect value="2025-12" onChange={onChange} now={NOW} />);

    await user.click(screen.getByRole('button', { name: 'Select year' }));
    await user.click(screen.getByRole('option', { name: '2026' }));

    expect(onChange).toHaveBeenCalledWith('2026-05'); // snapped to the current month
  });

  it('does not snap when the selected month is still valid in the newly picked year', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthYearSelect value="2025-03" onChange={onChange} now={NOW} />);

    await user.click(screen.getByRole('button', { name: 'Select year' }));
    await user.click(screen.getByRole('option', { name: '2024' }));

    expect(onChange).toHaveBeenCalledWith('2024-03');
  });
});
