// src/config.js
// Centralized backend API URL config

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default BACKEND_URL;
