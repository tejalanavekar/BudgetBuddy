// The Express app itself, with no side effects (no dotenv, no DB connect, no listen).
// Split out from server.js so tests can import and exercise it directly via supertest,
// against a test database, without booting a real server or touching the real one.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { generalApiLimiter } from './middleware/rateLimiters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];

const app = express();

app.use(helmet());
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    credentials: true
}));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
