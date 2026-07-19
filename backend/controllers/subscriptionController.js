import Subscription from '../models/Subscription.js';
import logger from '../utils/logger.js';

// Local YYYY-MM-DD from a Date object — NOT toISOString(), which converts to UTC first and can
// shift the date by one day for timezones behind/ahead of UTC (the same bug ExpensePage's
// getTodayLocal fixes on the frontend).
const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Given when the user actually started paying (purchaseDate) and how often it recurs,
// finds the next date on/after today in that recurring schedule (purchaseDate, +1 cycle, +2 cycles, ...).
// This is recomputed fresh from purchaseDate every time rather than incrementally advanced, so it
// can never drift — it's always exactly what the schedule says "next" should be, right now.
const computeNextBillingDate = (purchaseDate, billingCycle) => {
  const today = toLocalISO(new Date());
  const d = new Date(`${purchaseDate}T00:00:00`);
  let iso = toLocalISO(d);

  while (iso < today) {
    if (billingCycle === 'Annual') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    iso = toLocalISO(d);
  }
  return iso;
};

// There's no scheduled job in this app to recompute billing dates in the background, so instead
// each Active subscription's nextBillingDate is refreshed from its purchaseDate the moment it's
// read — self-healing on read instead of needing real cron infra.
const refreshNextBillingDate = async (sub) => {
  if (sub.status !== 'Active' || !sub.purchaseDate) return sub;

  const correct = computeNextBillingDate(sub.purchaseDate, sub.billingCycle);
  if (sub.nextBillingDate !== correct) {
    sub.nextBillingDate = correct;
    try {
      await sub.save();
    } catch (error) {
      // One legacy/malformed record shouldn't take down the whole list fetch — return it as-is.
      logger.error(`Failed to refresh nextBillingDate for subscription ${sub._id}:`, error.message);
    }
  }
  return sub;
};

export const createSubscription = async (req, res) => {
  try {
    const { userId, name, cost, billingCycle, category, purchaseDate } = req.body;

    if (!userId || !name || cost === undefined || !purchaseDate) {
      return res.status(400).json({ message: 'userId, name, cost, and purchaseDate are required' });
    }

    const resolvedCycle = billingCycle || 'Monthly';

    const subscription = new Subscription({
      userId,
      name,
      cost,
      billingCycle: resolvedCycle,
      category: category || 'Other',
      purchaseDate,
      nextBillingDate: computeNextBillingDate(purchaseDate, resolvedCycle)
    });

    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create subscription', error: error.message });
  }
};

export const getSubscriptions = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const subscriptions = await Subscription.find({ userId }).sort({ createdAt: -1 });
    const refreshed = await Promise.all(subscriptions.map(refreshNextBillingDate));
    res.json(refreshed);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cost, billingCycle, category, status, purchaseDate } = req.body;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (name !== undefined) subscription.name = name;
    if (cost !== undefined) subscription.cost = cost;
    if (billingCycle !== undefined) subscription.billingCycle = billingCycle;
    if (category !== undefined) subscription.category = category;
    if (status !== undefined) subscription.status = status;
    if (purchaseDate !== undefined) subscription.purchaseDate = purchaseDate;

    // Recompute nextBillingDate whenever the purchase date or cycle changes, so it can't go stale
    subscription.nextBillingDate = computeNextBillingDate(subscription.purchaseDate, subscription.billingCycle);

    await subscription.save();
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subscription', error: error.message });
  }
};

export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findByIdAndDelete(id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.json({ message: 'Subscription deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete subscription', error: error.message });
  }
};
