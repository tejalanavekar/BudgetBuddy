import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photoUrl: { type: String, default: null },
  preferences: {
    currency: { type: String, default: 'USD' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    weekStart: { type: String, default: 'Monday' },
    compactMode: { type: Boolean, default: false }
  },
  notificationPrefs: {
    emailDigest: { type: Boolean, default: false },
    budgetLimitWarning: { type: Boolean, default: true },
    subscriptionReminders: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: true },
    monthlySummary: { type: Boolean, default: false }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
