const mongoose = require("mongoose");
const { PRODUCT_CATEGORIES, PRODUCT_STATUS } = require("../constants");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    category: { type: String, enum: PRODUCT_CATEGORIES, required: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 5, min: 0 },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    sizes: { type: [String], default: [] },
    status: { type: String, enum: PRODUCT_STATUS, default: "active" },
    soldQuantity: { type: Number, default: 0 },
    soldRevenue: { type: Number, default: 0 },
    purchasedQuantity: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", sku: "text" });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ currentStock: 1 });

module.exports = mongoose.model("Product", productSchema);