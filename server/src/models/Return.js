const mongoose = require("mongoose");
const {
  RETURN_REASONS,
  RETURN_CONDITIONS,
  RETURN_STATUSES,
} = require("../constants");

const returnItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String },
    sku: { type: String },
    size: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    refundPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    reason: { type: String, enum: RETURN_REASONS, default: "Other" },
    condition: { type: String, enum: RETURN_CONDITIONS, default: "good" },
  },
  { _id: true }
);

const returnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true, trim: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", default: null },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    items: { type: [returnItemSchema], default: [] },
    totalRefundAmount: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    reason: { type: String, enum: RETURN_REASONS, default: "Other" },
    refundMethod: { type: String, default: "Cash" },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    refundStatus: { type: String, enum: RETURN_STATUSES, default: "processed" },
    returnDate: { type: Date, default: () => new Date() },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

returnSchema.index({ returnDate: -1 });
returnSchema.index({ sale: 1 });
returnSchema.index({ order: 1 });

module.exports = mongoose.model("Return", returnSchema);