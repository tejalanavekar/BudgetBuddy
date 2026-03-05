import API from '../axiosInstance';

//GET /expense/dashboard?userId=abc123
export const getDashboardStats = (userId) =>
  API.get('/expenses/dashboard', { params: { userId } });

//GET/expenses/summary?userId=abc123&month=2024-06
export const getMonthlySummary = (userId, month) =>
  API.get('/expenses/summary', { params: { userId, month } });