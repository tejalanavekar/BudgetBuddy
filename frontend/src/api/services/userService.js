import API from '../axiosInstance';

//GET /users/:id
export const getUserProfile = (userId) =>
  API.get(`/users/${userId}`);

//PUT /users/:id/password
//Change password — requires current password for verification
export const changePassword = (userId, payload) =>
  API.put(`/users/${userId}/password`, payload);

//PUT /users/:id — update firstName/lastName/phone/preferences/notificationPrefs (Settings)
export const updateUserProfile = (userId, payload) =>
  API.put(`/users/${userId}`, payload);

//PUT /users/:id/photo — upload a profile photo (Settings > Account)
export const uploadProfilePhoto = (userId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return API.put(`/users/${userId}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

//DELETE /users/:id — permanently delete the account and all its data (Settings > Data & Privacy)
export const deleteAccount = (userId) =>
  API.delete(`/users/${userId}`);