
import express from 'express';
import { registerUser, loginUser, getUserProfile, updateUserProfile, uploadProfilePhoto, deleteAccount, changePassword } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
const router = express.Router();

// Maps to POST /api/users
router.post('/', registerUser);

// Maps to POST /api/users/login
router.post('/login', loginUser);

router.get('/:userId', protect, getUserProfile);
router.put('/:userId', protect, updateUserProfile);
router.put('/:userId/photo', protect, upload.single('photo'), uploadProfilePhoto);
router.delete('/:userId', protect, deleteAccount);

//Update the user password
router.put('/:userId/password',protect,  changePassword);

export default router;