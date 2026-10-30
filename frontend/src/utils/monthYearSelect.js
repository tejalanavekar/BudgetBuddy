// Pure helpers for the Month + Year dropdown pair that replaced the single
// "October 2026" dropdown. Every function takes `now` as an explicit argument
// (defaulting to `new Date()`) instead of reading the clock itself, so tests can
// inject a fixed date and callers never need to hard-code a year.

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad2 = (n) => String(n).padStart(2, '0');

// "YYYY-MM" <-> { year, month } (month is 1-12 throughout this file, matching the
// calendar, not JS Date's 0-11).
export const toISO = (year, month) => `${year}-${pad2(month)}`;

export const fromISO = (iso) => {
  const [year, month] = iso.split('-').map(Number);
  return { year, month };
};

export const getCurrentYearMonth = (now = new Date()) => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1
});

// Years from the current one down to 2000, newest first — the year dropdown's options.
export const getYearOptions = (now = new Date()) => {
  const currentYear = now.getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2000; y--) years.push(y);
  return years;
};

// Only the current year's future months are disabled — any month in a past year is
// fair game, and a future year is never offered in the first place (getYearOptions
// stops at the current year), so this never needs to check year > currentYear.
export const isMonthDisabled = (year, month, now = new Date()) => {
  const current = getCurrentYearMonth(now);
  return year === current.year && month > current.month;
};

// If the given selection would land on a disabled (future) month, snaps it to the
// current month instead — used when the year changes out from under an
// already-selected future month (switching back to the current year).
export const clampSelection = (year, month, now = new Date()) => {
  if (!isMonthDisabled(year, month, now)) return { year, month };
  return getCurrentYearMonth(now);
};
