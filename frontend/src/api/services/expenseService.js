import API from '../axiosInstance';

//GET /expenses?userId=abc123
export const getExpenses = (userId) =>
  API.get('/expenses', { params: { userId } });
// { params: { userId } } → sends as query string: /expenses?userId=abc123
// backend reads: req.query.userId

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
export const getAllReceipts = (userId) =>
  API.get('/expenses/receipts', { params: { userId } });