import API from '../axiosInstance';

//GET /users/:id
export const getUserProfile = (userId) =>
  API.get(`/users/${userId}`);

//PUT /users/:id
export const updateUserProfile = (userId, updates) =>
  API.put(`/users/${userId}`, updates);

//PUT /users/:id/password
//Change password — requires current password for verification
export const changePassword = (userId, payload) =>
  API.put(`/users/${userId}/password`, payload);

//DELETE /users/:id
export const deleteUserAccount = (userId) =>
  API.delete(`/users/${userId}`);