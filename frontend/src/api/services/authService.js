// For login signin and signup related API calls
import API from '../axiosInstance';  // every call here will automatically include the token if it exists, and handle 401 globally

//credentials -> email and password, API post will send post requestts , no async await, it will just return the promise directlly. 
export const loginUser = (credentials) => 
    API.post('/users/login', credentials);


export const registerUser = (userData) =>
    API.post('/users', userData);

//idToken -> the credential Google's button hands back; backend verifies it and
//finds-or-creates the user, so this one call covers both sign-in and sign-up.
export const googleLogin = (idToken) =>
    API.post('/users/google-login', { idToken });

//Requests a reset-link email — backend always responds the same way whether or
//not the email is registered, so the frontend just shows one generic message.
export const forgotPassword = (email) =>
    API.post('/users/forgot-password', { email });

//token -> the raw value from the emailed reset link (not the login JWT)
export const resetPassword = (token, newPassword) =>
    API.post('/users/reset-password', { token, newPassword });
// Every async returns Promise, and every await needs to pause execution till the promises are resolved. 