// For login signin and signup related API calls
import API from '../axiosInstance';  // every call here will automatically include the token if it exists, and handle 401 globally

//credentials -> email and password, API post will send post requestts , no async await, it will just return the promise directlly. 
export const loginUser = (credentials) => 
    API.post('/users/login', credentials);


export const registerUser = (userData) => 
    API.post('/users', userData);
// Every async returns Promise, and every await needs to pause execution till the promises are resolved. 