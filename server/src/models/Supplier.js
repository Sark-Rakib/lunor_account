const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
    address: { type: String, default: "" },
    company: { type: String, default: "" },
    totalPurchase: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

supplierSchema.index({ name: "text", phone: "text" });

module.exports = mongoose.model("Supplier", supplierSchema);