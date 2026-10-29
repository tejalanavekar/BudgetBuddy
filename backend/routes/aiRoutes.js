import express from 'express';
import mongoose from 'mongoose';
import { chatWithAssistant } from '../controllers/aiController.js';
import protect from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.use(protect);

// Same ownership-check pattern as budgetRoutes.js — the URL's :userId must match
// the JWT-verified caller, or any user could run the assistant (which can read and
// propose changes to budgets/subscriptions) as any other user.
router.param('userId', (req, res, next, userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  if (userId !== req.userId) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  next();
});

router.post('/:userId/chat', aiLimiter, chatWithAssistant);

export default router;
