import express from 'express';
import {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription
} from '../controllers/subscriptionController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createSubscription);
router.get('/', protect, getSubscriptions);
router.put('/:id', protect, updateSubscription);
router.delete('/:id', protect, deleteSubscription);

export default router;
