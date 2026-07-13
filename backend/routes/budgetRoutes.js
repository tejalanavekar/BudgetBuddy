import express from 'express';
import {
  createOrUpdateBudget,
  getBudget,
  getUserBudgets,
  getDailySpentSnapshot,
  getBudgetSummary,
  deleteBudget
} from '../controllers/budgetController.js';

const router = express.Router();

// ── Specific Routes First (More Specific Before Generic) ──

// ── Analytics Routes (Most Specific) ──
// GET /api/budgets/:userId/snapshot/:monthYear - Get daily spent snapshot
router.get('/:userId/snapshot/:monthYear', getDailySpentSnapshot);

// ── AI Routes ──
// POST /api/budgets/:userId/summary - Get AI-generated summary
router.post('/:userId/summary', getBudgetSummary);

// GET /api/budgets/:userId/all - Get all budgets for user
router.get('/:userId/all', getUserBudgets);

// ── Generic Routes (Less Specific) ──
// POST /api/budgets/:userId - Create or update budget
router.post('/:userId', createOrUpdateBudget);

// GET /api/budgets/:userId/:monthYear - Get specific month budget
router.get('/:userId/:monthYear', getBudget);

// DELETE /api/budgets/:userId/:monthYear - Delete budget
router.delete('/:userId/:monthYear', deleteBudget);

export default router;
