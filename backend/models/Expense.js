import mongoose from "mongoose";

//for each item in the expense list receipt
const itemSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  category: { type: String, default: 'Other' }
}, { _id: false }); // id false as no separate id required per item for the user

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  receiptPath: { type: String },
  items: { type: [itemSchema], default: [] }
}, { timestamps: true });

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;