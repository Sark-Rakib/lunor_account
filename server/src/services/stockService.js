const StockMovement = require("../models/StockMovement");
const Product = require("../models/Product");
const { createNotification } = require("./notificationService");

async function adjustProductStock({ product, quantity, session = null }) {
  if (Number.isNaN(Number(quantity))) throw new Error("Invalid stock quantity");
  const newStock = Math.max(0, (product.currentStock || 0) + Number(quantity));
  product.currentStock = newStock;
  if (session) await product.save({ session });
  else await product.save();
  return newStock;
}

async function recordStockMovement({
  product,
  type,
  quantity,
  sign = 1,
  reason = "",
  referenceType = "",
  reference = null,
  user = null,
  date = new Date(),
  session = null,
  previousStock = null,
}) {
  const absQuantity = Math.abs(Number(quantity));
  let newStock;
  let prev = previousStock !== null ? previousStock : product.currentStock;
  if (sign === 0) {
    newStock = product.currentStock;
  } else {
    newStock = await adjustProductStock({ product, quantity: sign * absQuantity, session });
  }
  const movement = new StockMovement({
    product: product._id,
    type,
    quantity: sign === 0 ? absQuantity : sign * absQuantity,
    previousStock: prev,
    newStock,
    reason,
    referenceType,
    reference,
    user: user?._id || user || null,
    date,
  });
  if (session) await movement.save({ session });
  else await movement.save();
  return movement;
}

async function checkAndNotifyLowStock(products) {
  const settings = await require("../models/BusinessSettings").getSettings();
  if (!settings.inventorySettings.lowStockAlert && !settings.inventorySettings.outStockAlert) return;
  const list = Array.isArray(products) ? products : [products];
  for (const p of list) {
    if (p.currentStock <= 0) {
      await createNotification({
        title: "Out of stock",
        message: `${p.name} (${p.sku}) is out of stock.`,
        type: "out-stock",
        entityType: "Product",
        entity: p._id,
      });
    } else if (p.currentStock <= p.minimumStock && settings.inventorySettings.lowStockAlert) {
      await createNotification({
        title: "Low stock",
        message: `${p.name} (${p.sku}) is below minimum stock: ${p.currentStock} left.`,
        type: "low-stock",
        entityType: "Product",
        entity: p._id,
      });
    }
  }
}

module.exports = { adjustProductStock, recordStockMovement, checkAndNotifyLowStock };