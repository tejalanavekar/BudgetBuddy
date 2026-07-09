
import express from 'express';
import { registerUser, loginUser, getUserProfile, changePassword } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
const router = express.Router();

// Maps to POST /api/users
router.post('/', registerUser);

// Maps to POST /api/users/login
router.post('/login', loginUser);

router.get('/:userId', protect, getUserProfile);

//Update the user password 
router.put('/:userId/password',protect,  changePassword);

export default router;