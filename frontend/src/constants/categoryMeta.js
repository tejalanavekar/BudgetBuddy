// Single source of truth for expense category display metadata.
// Previously this exact map (categories + emoji) was copy-pasted independently into ~8 files,
// which had drifted: several copies were missing the "Entertainment" category entirely, so an
// Entertainment expense would silently fall back to the default emoji/icon in some places but not
// others. Icons now live in components/icons/Icon.jsx (<CategoryIcon category={cat} />) since the
// whole app moved from colored emoji to plain outline SVG icons; CATEGORY_COLOR stays here and is
// still used for data-viz (chart segments, progress bars, legend dots) — that color-coding is a
// data visualization concern, not an "icon", so it wasn't part of the icon-color changeover.

export const CATEGORIES = [
  'Food', 'Transport', 'Utilities', 'Entertainment', 'Health',
  'Education', 'Shopping', 'Travel', 'Savings', 'Other'
];

export const CATEGORY_COLOR = {
  Food: '#FF6384', Transport: '#36A2EB', Utilities: '#4BC0C0', Entertainment: '#FFCE56',
  Health: '#ef4444', Education: '#6366f1', Shopping: '#ec4899', Travel: '#f97316',
  Savings: '#10b981', Other: '#9966FF'
};
