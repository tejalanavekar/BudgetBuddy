import express from 'express';
import {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription
} from '../controllers/subscriptionController.js';
import protect from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { subscriptionCreateSchema, subscriptionUpdateSchema } from '../validation/schemas.js';

const router = express.Router();

router.post('/', protect, validate(subscriptionCreateSchema), createSubscription);
router.get('/', protect, getSubscriptions);
router.put('/:id', protect, validate(subscriptionUpdateSchema), updateSubscription);
router.delete('/:id', protect, deleteSubscription);

export default router;
