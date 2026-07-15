import axiosInstance from '../axiosInstance';
import { downloadBlob } from '../../utils/downloadBlob';

const BUDGET_API = '/budgets';

//Settings > Data & Privacy — download all budget records as a JSON file
export const exportBudgetsJSON = async (userId) => {
  const response = await axiosInstance.get(`${BUDGET_API}/${userId}/export/json`, { responseType: 'blob' });
  downloadBlob(response.data, 'budget-buddy-budgets.json');
};

// ── Budget CRUD Operations ──

/**
 * Create or update a budget for a specific month
 */
export const setBudget = async (userId, monthYear, totalMonthlyBudget, categoryBudgets = []) => {
  try {
    const response = await axiosInstance.post(`${BUDGET_API}/${userId}`, {
      monthYear,
      totalMonthlyBudget,
      categoryBudgets
    });
    return response.data;
  } catch (error) {
    console.error('Error setting budget:', error);
    throw error;
  }
};

/**
 * Get budget for a specific month
 */
export const getBudget = async (userId, monthYear) => {
  try {
    const response = await axiosInstance.get(`${BUDGET_API}/${userId}/${monthYear}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching budget:', error);
    throw error;
  }
};

/**
 * Get all budgets for a user
 */
export const getUserBudgets = async (userId) => {
  try {
    const response = await axiosInstance.get(`${BUDGET_API}/${userId}/all`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user budgets:', error);
    throw error;
  }
};

/**
 * Delete a budget
 */
export const deleteBudget = async (userId, monthYear) => {
  try {
    const response = await axiosInstance.delete(`${BUDGET_API}/${userId}/${monthYear}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
};

// ── Analytics Routes ──

/**
 * Get daily spent snapshot (includes comparison with previous month)
 */
export const getDailySpentSnapshot = async (userId, monthYear) => {
  try {
    const response = await axiosInstance.get(`${BUDGET_API}/${userId}/snapshot/${monthYear}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching daily snapshot:', error);
    throw error;
  }
};

// ── AI Routes ──

/**
 * Get AI-generated budget summary
 */
export const getBudgetSummary = async (userId, monthYear = null) => {
  try {
    const response = await axiosInstance.post(`${BUDGET_API}/${userId}/summary`, {
      monthYear
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    throw error;
  }
};
