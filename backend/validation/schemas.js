import { z } from 'zod';

// Same rule already enforced in registerUser: 8+ chars, at least one digit, no spaces or #, &, $.
const passwordRule = z.string().regex(
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

export const budgetSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'monthYear must be in YYYY-MM format'),
  totalMonthlyBudget: z.coerce.number().positive('Invalid budget amount'),
  categoryBudgets: z.array(z.object({
    category: z.string(),
    amount: z.coerce.number()
  })).optional()
});

export const subscriptionCreateSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  name: z.string().trim().min(1, 'name is required'),
  cost: z.coerce.number().nonnegative('cost must be a positive number'),
  billingCycle: z.string().optional(),
  category: z.string().optional(),
  purchaseDate: z.string().min(1, 'purchaseDate is required')
});

export const subscriptionUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  cost: z.coerce.number().nonnegative('cost must be a positive number').optional(),
  billingCycle: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  purchaseDate: z.string().optional()
});
