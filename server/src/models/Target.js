const mongoose = require("mongoose");
const { TARGET_TYPES } = require("../constants");

const targetSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // YYYY-MM
    revenueTarget: { type: Number, default: 0 },
    orderTarget: { type: Number, default: 0 },
    productSalesTarget: { type: Number, default: 0 },
    profitTarget: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

targetSchema.index({ month: 1 });

module.exports = mongoose.model("Target", targetSchema);