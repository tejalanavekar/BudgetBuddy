import Expense from '../models/Expense.js';
import logger from './logger.js';

/**
 * Calculate stats for Daily Spent Snapshot
 * Returns: daily spend rate, remaining budget, safe daily budget, etc.
 */
export const calculateDailySpentStats = async (userId, monthYear) => {
  try {
    const [year, month] = monthYear.split('-').map(Number);
    
    // Get first and last day of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const today = new Date();
    
    // Calculate days
    const totalDaysInMonth = lastDay.getDate();
    const daysElapsed = today.getDate();
    const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);
    
    // Get all expenses for this month
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];
    
    const expenses = await Expense.find({
      userId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    // Calculate spending
    const currentSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgDailySpend = daysElapsed > 0 ? currentSpending / daysElapsed : 0;
    
    // Category breakdown
    const categoryBreakdown = {};
    expenses.forEach(exp => {
      if (!categoryBreakdown[exp.category]) {
        categoryBreakdown[exp.category] = 0;
      }
      categoryBreakdown[exp.category] += exp.amount;
    });
    
    // Get recent expenses (last 5)
    const recentExpenses = expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    return {
      currentSpending: Number(currentSpending.toFixed(2)),
      avgDailySpend: Number(avgDailySpend.toFixed(2)),
      daysElapsed,
      totalDaysInMonth,
      daysRemaining,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, total]) => ({
        category,
        total: Number(total.toFixed(2))
      })),
      recentExpenses: recentExpenses.map(exp => ({
        category: exp.category,
        amount: exp.amount,
        description: exp.description
      }))
    };
  } catch (error) {
    logger.error('Error calculating daily stats:', error);
    throw error;
  }
};

/**
 * Calculate safe daily budget (remaining budget / remaining days)
 */
export const calculateSafeDailyBudget = (totalBudget, currentSpending, daysRemaining) => {
  if (daysRemaining <= 0) return 0;
  const remainingBudget = Math.max(0, totalBudget - currentSpending);
  return Number((remainingBudget / daysRemaining).toFixed(2));
};

/**
 * Compare spending with previous month
 */
export const compareWithPreviousMonth = async (userId, monthYear) => {
  try {
    const [year, month] = monthYear.split('-').map(Number);
    
    // Calculate previous month
    const prevDate = new Date(year, month - 2, 1);
    const prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    const [prevYear, prevMonth] = prevMonthYear.split('-').map(Number);
    const prevFirstDay = new Date(prevYear, prevMonth - 1, 1);
    const prevLastDay = new Date(prevYear, prevMonth, 0);
    
    const prevStartDate = prevFirstDay.toISOString().split('T')[0];
    const prevEndDate = prevLastDay.toISOString().split('T')[0];
    
    const prevExpenses = await Expense.find({
      userId,
      date: {
        $gte: prevStartDate,
        $lte: prevEndDate
      }
    });
    
    const prevMonthSpending = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      currentMonthYear: monthYear,
      previousMonthYear: prevMonthYear,
      previousMonthSpending: Number(prevMonthSpending.toFixed(2)),
      previousMonthTotal: prevExpenses.length
    };
  } catch (error) {
    logger.error('Error comparing months:', error);
    return {
      currentMonthYear: monthYear,
      previousMonthSpending: 0,
      previousMonthTotal: 0
    };
  }
};

/**
 * Get category budget summary
 */
export const getCategoryBudgetStatus = (categoryBudgets, categorySpending) => {
  return categoryBudgets.map(budget => {
    const spent = categorySpending[budget.category] || 0;
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount * 100).toFixed(1);
    
    return {
      category: budget.category,
      budget: budget.amount,
      spent: Number(spent.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      percentageUsed: parseFloat(percentage),
      overBudget: spent > budget.amount
    };
  });
};
