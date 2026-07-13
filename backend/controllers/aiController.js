import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import { runAssistant } from '../utils/langchainService.js';

// ── POST /api/ai/:userId/chat — chat with the assistant (budget, expenses, subscriptions, tips) ──
export const chatWithAssistant = async (req, res) => {
  try {
    const { userId } = req.params;
    const { question, history, page } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    const result = await runAssistant({ userId, question, history: history || [], page });

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
    console.error('Error in AI assistant chat:', error);
    res.status(500).json({
      error: 'Failed to process your question',
      details: error.message
    });
  }
};
