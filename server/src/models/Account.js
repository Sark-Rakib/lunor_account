const mongoose = require("mongoose");
const { ACCOUNT_TYPES } = require("../constants");

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    note: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

accountSchema.index({ type: 1 });

module.exports = mongoose.model("Account", accountSchema);