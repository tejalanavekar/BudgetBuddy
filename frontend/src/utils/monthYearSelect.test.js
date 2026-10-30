import { describe, it, expect } from 'vitest';
import {
  MONTH_NAMES, toISO, fromISO, getCurrentYearMonth,
  getYearOptions, isMonthDisabled, clampSelection
} from './monthYearSelect.js';

describe('toISO / fromISO', () => {
  it('round-trips year/month to and from "YYYY-MM"', () => {
    expect(toISO(2026, 5)).toBe('2026-05');
    expect(toISO(2026, 11)).toBe('2026-11');
    expect(fromISO('2026-05')).toEqual({ year: 2026, month: 5 });
  });
});

describe('getCurrentYearMonth', () => {
  it('reads year and 1-12 month from the injected date', () => {
    expect(getCurrentYearMonth(new Date(2026, 4, 15))).toEqual({ year: 2026, month: 5 });
  });
});

describe('getYearOptions', () => {
  it('starts at the injected current year and ends at 2000, descending', () => {
    const years = getYearOptions(new Date(2026, 4, 15));
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(2000);
    expect(years).toHaveLength(2026 - 2000 + 1);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBe(years[i - 1] - 1);
    }
  });

  it('never includes a future year', () => {
    const years = getYearOptions(new Date(2030, 0, 1));
    expect(Math.max(...years)).toBe(2030);
    expect(years.every(y => y <= 2030)).toBe(true);
  });
});

describe('isMonthDisabled', () => {
  const now = new Date(2026, 4, 15); // May 15, 2026

  it('disables months after the current month in the current year', () => {
    expect(isMonthDisabled(2026, 6, now)).toBe(true);
    expect(isMonthDisabled(2026, 12, now)).toBe(true);
  });

  it('enables the current month and earlier months in the current year', () => {
    expect(isMonthDisabled(2026, 5, now)).toBe(false);
    expect(isMonthDisabled(2026, 1, now)).toBe(false);
  });

  it('enables every month of a past year, even "future-looking" ones like December', () => {
    expect(isMonthDisabled(2025, 12, now)).toBe(false);
    expect(isMonthDisabled(2000, 12, now)).toBe(false);
  });

  it('handles the December → January rollover (now in January, prior Dec is still past)', () => {
    const jan = new Date(2026, 0, 10); // Jan 10, 2026
    expect(isMonthDisabled(2026, 12, jan)).toBe(true); // this year's Dec hasn't happened yet
    expect(isMonthDisabled(2025, 12, jan)).toBe(false); // last year's Dec already happened
    expect(isMonthDisabled(2026, 1, jan)).toBe(false); // current month itself
  });
});

describe('clampSelection', () => {
  const now = new Date(2026, 4, 15); // May 15, 2026

  it('snaps a disabled (future) month in the current year down to the current month', () => {
    expect(clampSelection(2026, 9, now)).toEqual({ year: 2026, month: 5 });
  });

  it('leaves an already-valid selection untouched', () => {
    expect(clampSelection(2026, 5, now)).toEqual({ year: 2026, month: 5 });
    expect(clampSelection(2026, 1, now)).toEqual({ year: 2026, month: 1 });
    expect(clampSelection(2020, 12, now)).toEqual({ year: 2020, month: 12 });
  });
});

describe('MONTH_NAMES', () => {
  it('has all 12 months, January first', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('January');
    expect(MONTH_NAMES[11]).toBe('December');
  });
});
