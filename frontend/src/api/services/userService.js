import API from '../axiosInstance';

//GET /users/:id
export const getUserProfile = (userId) =>
  API.get(`/users/${userId}`);

//PUT /users/:id/password
//Change password — requires current password for verification
export const changePassword = (userId, payload) =>
  API.put(`/users/${userId}/password`, payload);