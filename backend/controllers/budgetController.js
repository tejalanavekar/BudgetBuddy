import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import { 
  calculateDailySpentStats, 
  calculateSafeDailyBudget,
  compareWithPreviousMonth,
  getCategoryBudgetStatus 
} from '../utils/budgetAnalytics.js';
import { generateBudgetSummary } from '../utils/langchainService.js';

// ── Helper: Get current YYYY-MM ──
const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ── POST /api/budgets - Create or Update Budget ──
export const createOrUpdateBudget = async (req, res) => {
  try {
    const { userId } = req.params;
    const { monthYear, totalMonthlyBudget, categoryBudgets } = req.body;

    if (!totalMonthlyBudget || totalMonthlyBudget < 0) {
      return res.status(400).json({ error: 'Invalid budget amount' });
    }

    // Validate monthYear format
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ error: 'monthYear must be in YYYY-MM format' });
    }

    // Convert userId to ObjectId
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Try to find existing budget for this month
    let budget = await Budget.findOne({ userId: userIdObj, monthYear });

    if (budget) {
      // Update existing
      budget.totalMonthlyBudget = totalMonthlyBudget;
      if (categoryBudgets && Array.isArray(categoryBudgets)) {
        budget.categoryBudgets = categoryBudgets;
      }
    } else {
      // Create new
      budget = new Budget({
        userId: userIdObj,
        monthYear,
        totalMonthlyBudget,
        categoryBudgets: categoryBudgets || []
      });
    }

    await budget.save();
    res.json({ 
      success: true, 
      message: 'Budget saved',
      budget 
    });
  } catch (error) {
    console.error('Error saving budget:', error);
    res.status(500).json({ error: 'Failed to save budget' });
  }
};

// ── GET /api/budgets/:userId/:monthYear - Get Budget ──
export const getBudget = async (req, res) => {
  try {
    const { userId, monthYear } = req.params;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    let budget = await Budget.findOne({ userId: userIdObj, monthYear });

    // If no budget exists, return null/empty
    if (!budget) {
      return res.json({ budget: null, message: 'No budget set for this month' });
    }

    res.json({ budget });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
};

// ── GET /api/budgets/:userId - Get All Budgets for User ──
export const getUserBudgets = async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const budgets = await Budget.find({ userId: userIdObj }).sort({ monthYear: -1 });

    res.json({ budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

// Settings > Data & Privacy — download all budget records as a JSON file
export const exportBudgetsJSON = async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const budgets = await Budget.find({ userId: userIdObj }).sort({ monthYear: -1 });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="budget-buddy-budgets.json"');
    res.status(200).send(JSON.stringify(budgets, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Failed to export budgets' });
  }
};

// ── GET /api/budgets/:userId/snapshot/:monthYear - Get Daily Snapshot ──
export const getDailySpentSnapshot = async (req, res) => {
  try {
    const { userId, monthYear } = req.params;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get budget
    const budget = await Budget.findOne({ userId: userIdObj, monthYear });
    if (!budget) {
      return res.status(404).json({ error: 'Budget not set for this month' });
    }

    // Calculate daily stats
    const stats = await calculateDailySpentStats(userIdObj, monthYear);

    // Calculate safe daily budget
    const safeDailyBudget = calculateSafeDailyBudget(
      budget.totalMonthlyBudget,
      stats.currentSpending,
      stats.daysRemaining
    );

    // Get previous month comparison
    const comparison = await compareWithPreviousMonth(userIdObj, monthYear);

    // Get category status
    const categoryStatus = getCategoryBudgetStatus(
      budget.categoryBudgets,
      stats.categoryBreakdown.reduce((acc, cb) => {
        acc[cb.category] = cb.total;
        return acc;
      }, {})
    );

    res.json({
      monthYear,
      totalBudget: budget.totalMonthlyBudget,
      currentSpending: stats.currentSpending,
      remainingBudget: budget.totalMonthlyBudget - stats.currentSpending,
      percentageSpent: ((stats.currentSpending / budget.totalMonthlyBudget) * 100).toFixed(1),
      avgDailySpend: stats.avgDailySpend,
      safeDailyBudget,
      daysElapsed: stats.daysElapsed,
      daysRemaining: stats.daysRemaining,
      totalDaysInMonth: stats.totalDaysInMonth,
      categoryBreakdown: stats.categoryBreakdown,
      categoryStatus,
      recentExpenses: stats.recentExpenses,
      previousMonth: comparison
    });
  } catch (error) {
    console.error('Error getting daily snapshot:', error);
    res.status(500).json({ error: 'Failed to generate snapshot' });
  }
};

// ── POST /api/budgets/:userId/summary - Get AI Summary ──
export const getBudgetSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { monthYear } = req.body;

    const userIdObj = new mongoose.Types.ObjectId(userId);
    const targetMonthYear = monthYear || getCurrentMonthYear();

    // Get budget
    const budget = await Budget.findOne({ userId: userIdObj, monthYear: targetMonthYear });
    if (!budget) {
      return res.status(404).json({ error: 'Budget not set for this month' });
    }

    // Get expense stats
    const stats = await calculateDailySpentStats(userIdObj, targetMonthYear);

    // Prepare data
    const budgetData = {
      totalMonthlyBudget: budget.totalMonthlyBudget,
      categoryBudgets: budget.categoryBudgets
    };

    const expenseStats = {
      ...stats,
      remainingBudget: budget.totalMonthlyBudget - stats.currentSpending,
      safeDailyBudget: calculateSafeDailyBudget(
        budget.totalMonthlyBudget,
        stats.currentSpending,
        stats.daysRemaining
      )
    };

    // Generate summary
    const response = await generateBudgetSummary(userIdObj, budgetData, expenseStats);

    res.json({
      success: response.success,
      summary: response.summary
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

// ── DELETE /api/budgets/:userId/:monthYear - Delete Budget ──
export const deleteBudget = async (req, res) => {
  try {
    const { userId, monthYear } = req.params;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const result = await Budget.deleteOne({ userId: userIdObj, monthYear });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ success: true, message: 'Budget deleted' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
};
