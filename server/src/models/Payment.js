const mongoose = require("mongoose");
const { PAYMENT_TYPES } = require("../constants");

const paymentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: PAYMENT_TYPES, required: true },
    direction: { type: String, enum: ["in", "out"], required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, default: "Cash" },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    referenceType: { type: String, default: "" },
    reference: { type: mongoose.Schema.Types.ObjectId, default: null },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    description: { type: String, default: "" },
    paymentDate: { type: Date, default: () => new Date() },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ account: 1 });
paymentSchema.index({ reference: 1 });

module.exports = mongoose.model("Payment", paymentSchema);