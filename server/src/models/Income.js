const mongoose = require("mongoose");
const { INCOME_CATEGORIES } = require("../constants");

const incomeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: INCOME_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "Cash" },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    incomeDate: { type: Date, default: () => new Date() },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

incomeSchema.index({ incomeDate: -1 });
incomeSchema.index({ category: 1 });

module.exports = mongoose.model("Income", incomeSchema);