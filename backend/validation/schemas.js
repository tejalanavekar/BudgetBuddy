import { z } from 'zod';

// Same rule already enforced in registerUser: 8+ chars, at least one digit, no spaces or #, &, $.
// .max(72) matters because bcrypt silently ignores any bytes past 72 — without this,
// two passwords that differ only after byte 72 would hash identically.
const passwordRule = z.string()
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(
    /^(?=.*[0-9])(?!.*[#&$ ])(?!.* ).{8,}$/,
    'Password must be 8+ chars, include a number, and no spaces or #, &, $.'
  );

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: passwordRule
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required'),
  newPassword: passwordRule
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: passwordRule
});

// Matches constants/categoryMeta.js on the frontend — the only categories any
// expense form actually offers.
const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Utilities', 'Entertainment', 'Health',
  'Education', 'Shopping', 'Travel', 'Savings', 'Other'
];

const MONTH_YEAR_RULE = z.string().regex(/^\d{4}-\d{2}$/, 'monthYear must be in YYYY-MM format');
const DATE_RULE = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), 'date is not a real date');

const categoryBudgetSchema = z.object({
  category: z.string().trim().min(1).max(50),
  amount: z.coerce.number().finite().nonnegative()
});

export const budgetSchema = z.object({
  monthYear: MONTH_YEAR_RULE,
  totalMonthlyBudget: z.coerce.number().finite().positive('Invalid budget amount'),
  categoryBudgets: z.array(categoryBudgetSchema).max(50, 'Too many category budgets').optional()
});

const subscriptionName = z.string().trim().min(1, 'name is required').max(100, 'name must be 100 characters or fewer');
// $100k/cycle comfortably covers any real subscription while still bounding the field.
const subscriptionCost = z.coerce.number().finite().nonnegative('cost must be a positive number').max(100000, 'cost is unreasonably large');
const subscriptionBillingCycle = z.enum(['Monthly', 'Annual']);
const subscriptionStatus = z.enum(['Active', 'Paused', 'Cancelled']);
// Matches pages/SubscriptionsPage.jsx's CATEGORY_META — the only categories the
// subscription form actually offers.
const subscriptionCategory = z.enum(['Software', 'Streaming', 'Music', 'Health', 'Storage', 'News', 'Other']);
const purchaseDateRule = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'purchaseDate must be in YYYY-MM-DD format')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), 'purchaseDate is not a real date');

export const subscriptionCreateSchema = z.object({
  name: subscriptionName,
  cost: subscriptionCost,
  billingCycle: subscriptionBillingCycle.optional(),
  category: subscriptionCategory.optional(),
  purchaseDate: purchaseDateRule
});

export const subscriptionUpdateSchema = z.object({
  name: subscriptionName.optional(),
  cost: subscriptionCost.optional(),
  billingCycle: subscriptionBillingCycle.optional(),
  category: subscriptionCategory.optional(),
  status: subscriptionStatus.optional(),
  purchaseDate: purchaseDateRule.optional()
});

// req.body on expense create/update comes from multipart form fields (multer), so every
// field arrives as a plain string — `items` is a JSON-encoded array, parsed and validated
// here rather than left for the controller to JSON.parse blindly.
const expenseItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.coerce.number().finite().positive(),
  category: z.string().trim().max(50).optional()
});

// Returns undefined (not []) when the field is absent, so updateExpense can tell
// "items wasn't touched" apart from "items was explicitly cleared to []".
const expenseItemsField = z.string().optional().transform((raw, ctx) => {
  if (!raw) return undefined;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'items must be valid JSON' });
    return z.NEVER;
  }
  if (!Array.isArray(parsed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'items must be an array' });
    return z.NEVER;
  }
  if (parsed.length > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'items cannot exceed 100 entries' });
    return z.NEVER;
  }
  const result = z.array(expenseItemSchema).safeParse(parsed);
  if (!result.success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error.issues[0]?.message || 'invalid items' });
    return z.NEVER;
  }
  return result.data;
});

export const expenseCreateSchema = z.object({
  description: z.string().trim().min(1, 'description is required').max(200),
  // $1,000,000 is an arbitrary but generous ceiling — comfortably above any real personal expense.
  amount: z.coerce.number().finite().positive('amount must be a positive number').max(1000000, 'amount is unreasonably large'),
  category: z.enum(EXPENSE_CATEGORIES),
  date: DATE_RULE,
  items: expenseItemsField
});

export const expenseUpdateSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  amount: z.coerce.number().finite().positive().max(1000000).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  date: DATE_RULE.optional(),
  items: expenseItemsField
});

// Mirrors FloatingChatbot.jsx's PAGE_LABELS values (plus the "app" fallback) — the only
// page labels the frontend ever actually sends.
const AI_PAGE_VALUES = [
  'Dashboard', 'Expense', 'Past Expenses', 'Receipt Vault',
  'Budget', 'Subscriptions', 'Profile', 'Settings', 'app'
];

export const aiChatSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(2000, 'Question is too long'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000)
  })).max(20, 'Too much chat history').optional().default([]),
  page: z.enum(AI_PAGE_VALUES).optional().default('app')
});

const preferencesSchema = z.object({
  currency: z.string().trim().max(10).optional(),
  dateFormat: z.string().trim().max(20).optional(),
  weekStart: z.string().trim().max(20).optional(),
  compactMode: z.boolean().optional()
}).strict();

const notificationPrefsSchema = z.object({
  emailDigest: z.boolean().optional(),
  budgetLimitWarning: z.boolean().optional(),
  subscriptionReminders: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  monthlySummary: z.boolean().optional()
}).strict();

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(20).regex(/^[0-9+\-() .]*$/, 'Invalid phone number').optional(),
  preferences: preferencesSchema.optional(),
  notificationPrefs: notificationPrefsSchema.optional()
}).strict();
