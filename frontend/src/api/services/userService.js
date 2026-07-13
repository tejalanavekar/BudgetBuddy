import API from '../axiosInstance';

//GET /users/:id
export const getUserProfile = (userId) =>
  API.get(`/users/${userId}`);

//PUT /users/:id/password
//Change password — requires current password for verification
export const changePassword = (userId, payload) =>
  API.put(`/users/${userId}/password`, payload);

//PUT /users/:id — update firstName/lastName/phone (Settings > Account)
export const updateUserProfile = (userId, payload) =>
  API.put(`/users/${userId}`, payload);