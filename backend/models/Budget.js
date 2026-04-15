import mongoose from 'mongoose';

const categoryBudgetSchema = new mongoose.Schema({
  category: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  monthYear: {
    type: String,
    required: true, // Format: "2026-04"
    validate: {
      validator: (v) => /^\d{4}-\d{2}$/.test(v),
      message: 'monthYear must be in format YYYY-MM'
    }
  },
  totalMonthlyBudget: {
    type: Number,
    required: true,
    min: 0
  },
  categoryBudgets: {
    type: [categoryBudgetSchema],
    default: []
  }
}, { timestamps: true });

// Compound unique index: each user can only have one budget per month
budgetSchema.index({ userId: 1, monthYear: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
