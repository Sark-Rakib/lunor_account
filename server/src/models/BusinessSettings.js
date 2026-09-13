const mongoose = require("mongoose");

const businessSettingsSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: "LUNOR" },
    tagline: { type: String, default: "Business Manager" },
    logo: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    currency: { type: String, default: "BDT" },
    currencySymbol: { type: String, default: "৳" },
    timezone: { type: String, default: "Asia/Dhaka" },
    registrationEnabled: { type: Boolean, default: false },
    orderSettings: {
      defaultStatus: { type: String, default: "Pending" },
      autoConfirm: { type: Boolean, default: false },
      autoDeductStockOnConfirm: { type: Boolean, default: true },
    },
    inventorySettings: {
      lowStockAlert: { type: Boolean, default: true },
      outStockAlert: { type: Boolean, default: true },
    },
    notificationSettings: {
      lowStock: { type: Boolean, default: true },
      outStock: { type: Boolean, default: true },
      pendingOrders: { type: Boolean, default: true },
      dues: { type: Boolean, default: true },
      targets: { type: Boolean, default: true },
      returns: { type: Boolean, default: true },
    },
    invoicePrefix: { type: String, default: "INV" },
    orderPrefix: { type: String, default: "ORD" },
    purchasePrefix: { type: String, default: "PUR" },
    returnPrefix: { type: String, default: "RET" },
  },
  { timestamps: true }
);

businessSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("BusinessSettings", businessSettingsSchema);