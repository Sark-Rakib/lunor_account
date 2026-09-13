const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String },
  sku: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, default: 0 },
});

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true, trim: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    items: { type: [purchaseItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "Cash" },
    paymentStatus: { type: String, enum: ["paid", "partial", "unpaid"], default: "unpaid" },
    purchaseDate: { type: Date, default: () => new Date() },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ supplier: 1 });
purchaseSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Purchase", purchaseSchema);