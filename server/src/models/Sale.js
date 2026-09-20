const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String },
    sku: { type: String },
    size: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, default: 0 },
    lineCost: { type: Number, default: 0 },
    returnedQuantity: { type: Number, default: 0 },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, default: "", trim: true },
    items: { type: [saleItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    productCost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "Cash" },
    paymentStatus: { type: String, enum: ["paid", "partial", "unpaid"], default: "paid" },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    saleDate: { type: Date, default: () => new Date() },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["completed", "cancelled"], default: "completed" },
    returnedAmount: { type: Number, default: 0 },
    returnedQuantity: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

saleSchema.index({ saleDate: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ customer: 1 });

module.exports = mongoose.model("Sale", saleSchema);