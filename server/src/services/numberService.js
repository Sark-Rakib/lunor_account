const Counter = require("../models/Counter");
const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Purchase = require("../models/Purchase");
const Return = require("../models/Return");
const BusinessSettings = require("../models/BusinessSettings");
const AppError = require("../utils/AppError");

const CONFIG = {
  invoice: {
    model: Sale,
    field: "invoiceNumber",
    counter: "invoice",
    prefixKey: "invoicePrefix",
    defaultPrefix: "INV",
  },
  order: {
    model: Order,
    field: "orderNumber",
    counter: "order",
    prefixKey: "orderPrefix",
    defaultPrefix: "ORD",
  },
  purchase: {
    model: Purchase,
    field: "purchaseNumber",
    counter: "purchase",
    prefixKey: "purchasePrefix",
    defaultPrefix: "PUR",
  },
  return: {
    model: Return,
    field: "returnNumber",
    counter: "return",
    prefixKey: "returnPrefix",
    defaultPrefix: "RET",
  },
};

async function getSettings() {
  return BusinessSettings.getSettings();
}

async function generateNumber(key) {
  const cfg = CONFIG[key];
  if (!cfg) throw new AppError(`Unknown number key: ${key}`, 400);
  const settings = await getSettings();
  const prefix =
    (settings[cfg.prefixKey] && String(settings[cfg.prefixKey]).trim()) || cfg.defaultPrefix;
  const counter = await Counter.findOneAndUpdate(
    { name: cfg.counter },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const yearShort = String(new Date().getFullYear()).slice(-2);
  return `${prefix}${yearShort}-${String(counter.seq).padStart(5, "0")}`;
}

module.exports = { getSettings, generateNumber };