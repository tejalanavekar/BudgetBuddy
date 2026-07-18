import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  // Not collected at signup (Google or password) — left settable later from Settings.
  phone: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function () { return this.authProvider === 'local'; } },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, unique: true, sparse: true }, // sparse: only enforced unique among docs that have it
  photoUrl: { type: String, default: null },
  // Forgot-password flow — only a hash of the token is ever stored (same principle as
  // the password itself), so a database leak alone can't be used to reset an account.
  resetPasswordTokenHash: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
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
