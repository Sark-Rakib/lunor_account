const mongoose = require("mongoose");
const { ORDER_STATUSES } = require("../constants");

const orderItemSchema = new mongoose.Schema({
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
});

const timelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES },
    note: { type: String, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    productCost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "Cash" },
    paymentStatus: { type: String, enum: ["paid", "partial", "unpaid"], default: "unpaid" },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: "Pending" },
    timeline: { type: [timelineEntrySchema], default: [] },
    orderDate: { type: Date, default: () => new Date() },
    notes: { type: String, default: "" },
    deliveredAt: { type: Date },
    revenueRecognized: { type: Boolean, default: false },
    stockDeducted: { type: Boolean, default: false },
    returnedAmount: { type: Number, default: 0 },
    returnedQuantity: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

orderSchema.index({ orderDate: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ customer: 1 });

module.exports = mongoose.model("Order", orderSchema);