import API from '../axiosInstance';

//GET /expenses?userId=abc123
export const getExpenses = (userId) =>
  API.get('/expenses', { params: { userId } });
// { params: { userId } } → sends as query string: /expenses?userId=abc123
// backend reads: req.query.userId

//POST /expenses
//// We override Content-Type here as a safety net for file uploads
export const addExpense = (formData) =>
    API.post('/expenses', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
    });

//PUT /expenses/:id
export const updateExpense = (id, updates) =>
  API.put(`/expenses/${id}`, updates);

//DELETE /expenses/:id
export const deleteExpense = (id) =>
  API.delete(`/expenses/${id}`);