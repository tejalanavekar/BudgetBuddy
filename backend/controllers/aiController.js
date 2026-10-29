import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import { runAssistant } from '../utils/langchainService.js';
import logger from '../utils/logger.js';

// ── POST /api/ai/:userId/chat — chat with the assistant (budget, expenses, subscriptions, tips) ──
export const chatWithAssistant = async (req, res, next) => {
  try {
    const userId = req.userId;
    // Already validated (non-empty, length-capped question; capped history; allowlisted page)
    // by aiChatSchema.
    const { question, history, page } = req.body;

    const result = await runAssistant({ userId, question, history, page });

    // Logged regardless of success/failure — failed exchanges are useful signal too.
    await ChatMessage.create({
      userId: new mongoose.Types.ObjectId(userId),
      question,
      answer: result.message,
      toolsUsed: result.toolsUsed,
      page: page || 'app'
    });

    res.json({
      success: result.success,
      message: result.message,
      proposedAction: result.proposedAction || null,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error in AI assistant chat:', error);
    next(error);
  }
};
