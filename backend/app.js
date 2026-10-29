// The Express app itself, with no side effects (no dotenv, no DB connect, no listen).
// Split out from server.js so tests can import and exercise it directly via supertest,
// against a test database, without booting a real server or touching the real one.
import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/userRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { generalApiLimiter } from './middleware/rateLimiters.js';

const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];

const app = express();

// Without this, every request behind a reverse proxy (Render/Railway/Fly/Vercel) looks
// like it comes from the proxy's own IP, so every user shares one rate-limit bucket —
// one attacker can lock everyone out. The number is how many proxy hops are trusted to
// have set X-Forwarded-For correctly; set TRUST_PROXY_HOPS to match the actual deployment.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

app.use(helmet());
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    credentials: true
}));
// Explicit cap — the default is already reasonable, but an unbounded JSON body on
// every endpoint (not just uploads, which have their own 10MB file-size limit) is an
// easy memory-exhaustion vector. 100kb comfortably covers the largest real payload
// (a budget with 50 category entries, or 20 chat history turns).
app.use(express.json({ limit: '100kb' }));

// A short id per request, purely for correlating a client-facing error with the
// matching server log line — carries no information about the request itself.
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// Registered before the general limiter below so health checks/monitoring are
// never throttled — Express matches middleware/routes in registration order,
// so this responds and short-circuits before the limiter ever runs for this path.
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', node: process.version });
});

// A broad floor under all authenticated API traffic — on top of (not instead of)
// the stricter per-endpoint limiters (login, password reset, AI) applied inside
// their own route files.
app.use('/api', generalApiLimiter);

app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/ai', aiRoutes);

// Must be last — catches anything a route/controller's own try/catch missed.
app.use(errorHandler);

export default app;
