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

// AI chat/summary: each request calls Groq, and the whole app shares one Groq account
// with a hard 30 requests/minute free-tier ceiling — one client hammering this endpoint
// can exhaust that shared budget and lock out every other user, not just themselves.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { message: 'Too many AI requests. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API traffic: a broad safety net for every other authenticated endpoint
// (expenses, budgets, subscriptions), none of which had any limit at all before this.
// Generous enough that normal usage — multiple tabs, a dashboard polling itself —
// never comes close, while still stopping a scripted flood.
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
