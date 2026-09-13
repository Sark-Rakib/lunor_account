const mongoose = require("mongoose");
const { STOCK_MOVEMENT_TYPES } = require("../constants");

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, default: 0 },
    newStock: { type: Number, default: 0 },
    reason: { type: String, default: "" },
    referenceType: { type: String, default: "" },
    reference: { type: mongoose.Schema.Types.ObjectId, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    date: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

stockMovementSchema.index({ product: 1, date: -1 });
stockMovementSchema.index({ type: 1 });

module.exports = mongoose.model("StockMovement", stockMovementSchema);