// Single source of truth for expense category display metadata (emoji + accent color).
// Previously this exact map was copy-pasted independently into ~8 files, which had drifted:
// several copies were missing the "Entertainment" category entirely, so an Entertainment
// expense would silently fall back to the default emoji/color in some places but not others.

export const CATEGORIES = [
  'Food', 'Transport', 'Utilities', 'Entertainment', 'Health',
  'Education', 'Shopping', 'Travel', 'Savings', 'Other'
];

export const CATEGORY_EMOJI = {
  Food: '🍔', Transport: '🚗', Utilities: '💡', Entertainment: '🎬', Health: '💊',
  Education: '📚', Shopping: '🛍️', Travel: '✈️', Savings: '💰', Other: '📦'
};

export const CATEGORY_COLOR = {
  Food: '#FF6384', Transport: '#36A2EB', Utilities: '#4BC0C0', Entertainment: '#FFCE56',
  Health: '#ef4444', Education: '#6366f1', Shopping: '#ec4899', Travel: '#f97316',
  Savings: '#10b981', Other: '#9966FF'
};
