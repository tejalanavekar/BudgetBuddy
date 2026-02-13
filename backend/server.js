import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js'; 
import userRoutes from './routes/userRoutes.js'; // Your new User routes
import expenseRoutes from './routes/expenseRoutes.js'; // Your new Expense routes

// Initialize environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 5000;

// Standard Middleware
app.use(cors());
app.use(express.json());

// Startup Sanity Checks (Keep these for debugging in dev)
if (process.env.NODE_ENV !== 'production') {
    console.log('Startup checks:');
    console.log('- ATLAS_URI present:', !!process.env.ATLAS_URI);
    console.log('- process.cwd():', process.cwd());
}
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
 
// Health Check / Debug Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', node: process.version });
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});