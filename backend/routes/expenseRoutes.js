import express from 'express';
import multer from 'multer';
import { createExpense, getExpenses } from '../controllers/expenseController.js';

const router = express.Router();

// Initialize multer (memory storage is best for simple AI/Cloud integration)
const upload = multer();

// Maps to POST /api/expenses
// upload.single('receipt') parses the file field named 'receipt'
router.post('/', upload.single('receipt'), createExpense);

// Maps to GET /api/expenses?userId=...
router.get('/', getExpenses);

export default router;