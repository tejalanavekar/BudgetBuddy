import API from '../axiosInstance';
import { downloadBlob } from '../../utils/downloadBlob';

//GET /expenses — the backend identifies the caller from the JWT, not a client-supplied id
export const getExpenses = () =>
  API.get('/expenses');

//POST /expenses
//// We override Content-Type here as a safety net for file uploads

export const scanReceiptWithVision = (imageFile) => {
  const formData = new FormData();
  formData.append('receipt', imageFile);
  return API.post('/expenses/scan-receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const addExpense = (formData) =>
    API.post('/expenses', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
    });

//PUT /expenses/:id
export const updateExpense = (id, updates) => {
  // If updates is FormData, set the correct header
  if (updates instanceof FormData) {
    return API.put(`/expenses/${id}`, updates, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  return API.put(`/expenses/${id}`, updates);
};

//DELETE /expenses/:id
export const deleteExpense = (id) =>
  API.delete(`/expenses/${id}`);

//Getting all the exppenses
export const getAllReceipts = () =>
  API.get('/expenses/receipts');

//Settings > Data & Privacy — download all expenses as a CSV file
export const exportExpensesCSV = async () => {
  const response = await API.get('/expenses/export/csv', { responseType: 'blob' });
  downloadBlob(response.data, 'budget-buddy-expenses.csv');
};

//Settings > Data & Privacy — download every uploaded receipt image as a ZIP
export const exportReceiptsZip = async () => {
  const response = await API.get('/expenses/export/receipts-zip', { responseType: 'blob' });
  downloadBlob(response.data, 'budget-buddy-receipts.zip');
};

//Settings > Data & Privacy — permanently delete all expenses for the current month
export const clearMonthExpenses = () =>
  API.delete('/expenses/clear-month');