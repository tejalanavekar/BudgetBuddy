// Local YYYY-MM-DD for today — toISOString() converts to UTC first, which can
// show the wrong day for users behind/ahead of UTC.
export const getTodayLocalISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Robust year/month extraction from an expense's `date` field. Expenses are supposed to
// always store "YYYY-MM-DD" (or an ISO datetime), but a handful of older records ended up
// with a stray `Date.toString()`-style value (e.g. from a stale edit path) — the fast regex
// path handles the normal case, and falling back to the Date constructor means a malformed
// value still gets counted correctly instead of silently vanishing from month/year totals.
export const getYearMonth = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return [null, null];

  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return [parseInt(isoMatch[1]), parseInt(isoMatch[2])];

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return [null, null];
  return [parsed.getFullYear(), parsed.getMonth() + 1];
};
