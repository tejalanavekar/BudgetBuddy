import express from 'express';
import { registerUser, loginUser, getUsers } from '../controllers/userController.js';

const router = express.Router();

// Maps to POST /api/users
router.post('/', registerUser); 

// Maps to POST /api/users/login
router.post('/login', loginUser); 

// Maps to GET /api/users (Debug/Admin only)
router.get('/', getUsers); 

export default router;