const mongoose = require("mongoose");
const { EXPENSE_CATEGORIES } = require("../constants");

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "Cash" },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    expenseDate: { type: Date, default: () => new Date() },
    description: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model("Expense", expenseSchema);