import express from 'express';
import { chatWithAssistant } from '../controllers/aiController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/:userId/chat', protect, chatWithAssistant);

export default router;
