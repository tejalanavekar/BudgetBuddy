import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:          { type: String, required: true },
  cost:          { type: Number, required: true },
  billingCycle:  { type: String, enum: ['Monthly', 'Annual'], default: 'Monthly' },
  category:      { type: String, default: 'Other' },
  status:        { type: String, enum: ['Active', 'Paused', 'Cancelled'], default: 'Active' },
  purchaseDate:  { type: String, required: true }, // YYYY-MM-DD — when the user actually started paying for this
  nextBillingDate: { type: String, required: true } // YYYY-MM-DD — derived from purchaseDate + billingCycle, not user-entered
}, { timestamps: true });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
