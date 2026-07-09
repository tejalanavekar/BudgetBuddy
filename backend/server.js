//Main backend entry point and starting the server
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js'; 
import userRoutes from './routes/userRoutes.js'; // Your new User routes
import expenseRoutes from './routes/expenseRoutes.js'; // Your new Expense routes
import budgetRoutes from './routes/budgetRoutes.js'; // Budget routes with AI integration
import subscriptionRoutes from './routes/subscriptionRoutes.js';

// Initialize environment variables
dotenv.config();
// Connect to MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = ['http://localhost:5173'];

// Standard Middleware
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    credentials: true
}));
app.use(express.json());

// Startup Sanity Checks (Keep these for debugging in dev)
if (process.env.NODE_ENV !== 'production') {
    console.log('Startup checks:');
    console.log('- ATLAS_URI present:', !!process.env.ATLAS_URI);
    console.log('- process.cwd():', process.cwd());
}
import path from 'path';
import { fileURLToPath } from 'url';

// Serve uploads directory statically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Health Check / Debug Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', node: process.version });
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});