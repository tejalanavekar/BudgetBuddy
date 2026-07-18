import rateLimit from 'express-rate-limit';

// Login: throttle brute-force password guessing per IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Forgot/reset password: stricter — each hit sends a real email through our Gmail
// account, so this also protects against using the server as an email-bombing vector.
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
