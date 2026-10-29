import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Login: two limiters stacked, each catching what the other can't.
//
// loginLimiter (IP + email) stops one attacker grinding guesses against a single
// account — including by spreading those guesses across many IPs, since each IP
// gets its own bucket *per email* rather than being blocked outright.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email || '').toLowerCase()}`,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// loginLimiterByIp (IP alone) catches the case the email-keyed limiter above can't:
// one attacker spraying a *different* email on every attempt from the same IP (a
// credential-stuffing list, not a single-account grind) — each email would get its
// own fresh loginLimiter bucket, so without this an attacker could try unlimited
// accounts from one IP as long as they never repeat an email.
export const loginLimiterByIp = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Register/Google-login: no password to brute-force here, but still worth capping —
// unbounded account creation is spam, and Google-login calls Google's own verifyIdToken
// on every hit.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
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
