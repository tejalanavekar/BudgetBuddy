
import express from 'express';
import { registerUser, loginUser, googleLogin, getUserProfile, updateUserProfile, uploadProfilePhoto, deleteAccount, changePassword, forgotPassword, resetPassword } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import validateImageSignature from '../middleware/validateImageSignature.js';
import validate from '../middleware/validate.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { loginLimiter, loginLimiterByIp, authLimiter, passwordResetLimiter } from '../middleware/rateLimiters.js';
import { registerSchema, loginSchema, googleLoginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../validation/schemas.js';
const router = express.Router();

// Maps to POST /api/users
router.post('/', authLimiter, validate(registerSchema), registerUser);

// Maps to POST /api/users/login
router.post('/login', loginLimiterByIp, loginLimiter, validate(loginSchema), loginUser);

// Maps to POST /api/users/google-login — handles both Google sign-in and sign-up
router.post('/google-login', authLimiter, validate(googleLoginSchema), googleLogin);

// Forgot/reset password — both public, no token yet (that's the whole point)
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword);

router.get('/:userId', protect, validateObjectId('userId'), getUserProfile);
router.put('/:userId', protect, validateObjectId('userId'), updateUserProfile);
router.put('/:userId/photo', protect, validateObjectId('userId'), upload.single('photo'), validateImageSignature, uploadProfilePhoto);
router.delete('/:userId', protect, validateObjectId('userId'), deleteAccount);

//Update the user password
router.put('/:userId/password', protect, validateObjectId('userId'), validate(changePasswordSchema), changePassword);

export default router;