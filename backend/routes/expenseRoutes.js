import express from 'express';
import multer from 'multer';
import { scanReceipt, createExpense, getExpenses } from '../controllers/expenseController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Initialize multer (memory storage is best for simple AI/Cloud integration)
const upload = multer();

// Maps to POST /api/expenses
// upload.single('receipt') parses the file field named 'receipt'
router.post('/scan-receipt', protect, upload.single('receipt'), scanReceipt);
router.post('/', protect, upload.single('receipt'), createExpense);
// Maps to GET /api/expenses?userId=...
router.get('/', protect, getExpenses);

export default router;