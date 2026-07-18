import express from 'express';
import {
  createOrUpdateBudget,
  getBudget,
  getUserBudgets,
  getDailySpentSnapshot,
  getBudgetSummary,
  deleteBudget,
  exportBudgetsJSON
} from '../controllers/budgetController.js';
import protect from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { budgetSchema } from '../validation/schemas.js';

const router = express.Router();

router.use(protect);

// Every route below starts with :userId — check ownership once here instead of
// repeating it in each controller function.
router.param('userId', (req, res, next, userId) => {
  if (userId !== req.userId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  next();
});

// ── Specific Routes First (More Specific Before Generic) ──

// ── Analytics Routes (Most Specific) ──
// GET /api/budgets/:userId/snapshot/:monthYear - Get daily spent snapshot
router.get('/:userId/snapshot/:monthYear', getDailySpentSnapshot);

// ── AI Routes ──
// POST /api/budgets/:userId/summary - Get AI-generated summary
router.post('/:userId/summary', getBudgetSummary);

// GET /api/budgets/:userId/all - Get all budgets for user
router.get('/:userId/all', getUserBudgets);

// GET /api/budgets/:userId/export/json - Download all budgets as JSON
router.get('/:userId/export/json', exportBudgetsJSON);

// ── Generic Routes (Less Specific) ──
// POST /api/budgets/:userId - Create or update budget
router.post('/:userId', validate(budgetSchema), createOrUpdateBudget);

// GET /api/budgets/:userId/:monthYear - Get specific month budget
router.get('/:userId/:monthYear', getBudget);

// DELETE /api/budgets/:userId/:monthYear - Delete budget
router.delete('/:userId/:monthYear', deleteBudget);

export default router;
