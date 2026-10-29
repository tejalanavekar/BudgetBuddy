import express from 'express';
import {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription
} from '../controllers/subscriptionController.js';
import protect from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { subscriptionCreateSchema, subscriptionUpdateSchema } from '../validation/schemas.js';

const router = express.Router();

router.post('/', protect, validate(subscriptionCreateSchema), createSubscription);
router.get('/', protect, getSubscriptions);
router.put('/:id', protect, validateObjectId('id'), validate(subscriptionUpdateSchema), updateSubscription);
router.delete('/:id', protect, validateObjectId('id'), deleteSubscription);

export default router;
