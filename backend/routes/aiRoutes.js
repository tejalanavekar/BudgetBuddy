import express from 'express';
import { chatWithAssistant } from '../controllers/aiController.js';
import protect from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/:userId/chat', protect, aiLimiter, chatWithAssistant);

export default router;
