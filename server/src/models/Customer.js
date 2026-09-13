const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
    address: { type: String, default: "" },
    notes: { type: String, default: "" },
    totalOrders: { type: Number, default: 0 },
    totalPurchased: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    lastOrder: { type: Date },
    returnCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

customerSchema.index({ name: "text", phone: "text" });

module.exports = mongoose.model("Customer", customerSchema);