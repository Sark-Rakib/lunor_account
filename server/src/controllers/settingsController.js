const BusinessSettings = require("../models/BusinessSettings");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { getSettings } = require("../services/numberService");
const { logActivity } = require("../services/activityService");

const getSettingsHandler = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  sendSuccess(res, { settings }, "Settings fetched", 200);
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await BusinessSettings.getSettings();
  const { general, orderSettings, inventorySettings, notificationSettings } = req.body;

  if (general) {
    const safe = ["businessName", "tagline", "logo", "phone", "email", "address", "currency", "currencySymbol", "timezone", "invoicePrefix", "orderPrefix", "purchasePrefix", "returnPrefix", "registrationEnabled"];
    safe.forEach((k) => {
      if (general[k] !== undefined) settings[k] = general[k];
    });
  }
  if (orderSettings) {
    ["defaultStatus", "autoConfirm", "autoDeductStockOnConfirm"].forEach((k) => {
      if (orderSettings[k] !== undefined) settings.orderSettings[k] = orderSettings[k];
    });
  }
  if (inventorySettings) {
    ["lowStockAlert", "outStockAlert"].forEach((k) => {
      if (inventorySettings[k] !== undefined) settings.inventorySettings[k] = inventorySettings[k];
    });
  }
  if (notificationSettings) {
    ["lowStock", "outStock", "pendingOrders", "dues", "targets", "returns"].forEach((k) => {
      if (notificationSettings[k] !== undefined) settings.notificationSettings[k] = notificationSettings[k];
    });
  }

  await settings.save();
  await logActivity({ user: req.user, action: "updated", entity: "Settings", entityId: settings._id, description: "Updated business settings" });
  sendSuccess(res, { settings }, "Settings updated", 200);
});

module.exports = { getSettingsHandler, updateSettings };