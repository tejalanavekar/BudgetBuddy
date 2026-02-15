//prevents from writing backend url in every file

import axios from 'axios';
import BACKEND_URL from '../config';

const API = axios.create({
    baseURL: BACKEND_URL,
    timeout: 10000, // 10 seconds timeout if server doesn't  respond, it will kill the request
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Telling i am sending you json, i expect json back
    },
});

// Automatically attach the User ID to requests if needed, 
// or handle Token-based auth here in the future.
// --- REQUEST INTERCEPTOR ---
API.interceptors.request.use(
    (config) => {
        // 1. Fetch user data from storage
        const user = JSON.parse(localStorage.getItem('bt_user')); //grabs the user object which wwas filled during the signin process
        
        // 2. Add Auth Headers
        // If you move to JWT tokens later, you'd put 'Bearer <token>' here
        if (user && user.userId) {
            config.params = { ...config.params, userId: user.userId };
            config.headers['x-user-id'] = user.userId;  //instead of passing the  user id everytime, it passes in http header
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- RESPONSE INTERCEPTOR ---
API.interceptors.response.use(
    (response) => response, 
    (error) => {
        // 3. Global Error Handling
        if (error.response) {
            // If backend returns 401 (Unauthorized), force logout
            if (error.response.status === 401) {
                localStorage.clear();
                window.location.href = '/signin';
            }
            
            // Log specific error messages from your backend controllers
            console.error(`Backend Error: ${error.response.data.message}`);
        } else if (error.request) {
            console.error("Network Error: No response received from server.");
        }
        
        return Promise.reject(error);
    }
);

export default API;