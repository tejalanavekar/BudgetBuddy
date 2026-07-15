//all routes are protected by auth middleware, so user must be logged in to access any of these routes
import express from 'express';
import { scanReceipt, createExpense, getExpenses, updateExpense, getAllReceipts, deleteExpense, exportExpensesCSV, exportReceiptsZip, clearMonthExpenses } from '../controllers/expenseController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/scan-receipt', protect, upload.single('receipt'), scanReceipt);
router.post('/', protect, upload.single('receipt'), createExpense);
router.get('/', protect, getExpenses);

router.get('/receipts', protect, getAllReceipts);
router.get('/export/csv', protect, exportExpensesCSV);
router.get('/export/receipts-zip', protect, exportReceiptsZip);
router.delete('/clear-month', protect, clearMonthExpenses);
router.put('/:id', protect, upload.single('receipt'), updateExpense);
router.delete('/:id', protect, deleteExpense);

export default router;