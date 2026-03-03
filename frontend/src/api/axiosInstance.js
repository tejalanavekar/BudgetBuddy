//prevents from writing backend url in every file

import axios from 'axios';
import BACKEND_URL from '../config';

const API = axios.create({
    baseURL: BACKEND_URL,
    timeout: 10000, // 10 seconds timeout if server doesn't  respond, it will kill the request
    headers: {
        'Accept': 'application/json', // Telling i am sending you json, i expect json back
    },
});

// Automatically attach the User ID to requests if needed, 
// or handle Token-based auth here in the future.
// --- REQUEST INTERCEPTOR --- -> runs before every request leaves the browser
API.interceptors.request.use(
    (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('bt_token');

        // Add Bearer token to every request if it exists
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';  //  For like uploads and all it wiill set header on its own
    }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


// --- RESPONSE INTERCEPTOR --- rund after every response comes back , 401-> token expired or missing
API.interceptors.response.use(
    (response) => response, 
    (error) => {

        const status = error.response?.status;
        const url = error.config?.url || '';
        console.error("Interceptor caught error:", status, url);
        // 3. Global Error Handling
        if (status === 401 && !url.includes('/login')) {
            // If backend returns 401 (Unauthorized), force logout
                localStorage.clear();
                window.location.href = '/signin';  // hard redirect 
                
            }
            
            // Log specific error messages from your backend controllers
            if (error.response?.data?.message) {
            console.error(`Backend Error Message: ${error.response.data.message}`);
        }
        
        return Promise.reject(error);
});

export default API;