const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const AppError = require("../utils/AppError");
const { recordStockMovement, checkAndNotifyLowStock } = require("./stockService");
const { createPayment } = require("./accountingService");
const { logActivity } = require("./activityService");
const { createNotification } = require("./notificationService");
const { generateNumber } = require("./numberService");
const { runInTransaction } = require("../config/db");

async function createPurchase({ body, user }) {
  const {
    supplier,
    items = [],
    paidAmount = 0,
    paymentMethod = "Cash",
    purchaseDate,
    notes = "",
    updateProductCost = true,
  } = body;

  if (!items || items.length === 0) throw new AppError("Purchase must contain at least one product", 400);

  let supplierDoc = null;
  if (supplier) {
    supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) throw new AppError("Supplier not found", 404);
  }

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const purchase = await runInTransaction(async (session) => {
    const enrichedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = productMap.get(String(item.product));
      if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
      const quantity = Number(item.quantity);
      const price = Number(item.price);
      if (!quantity || quantity < 1) throw new AppError(`Invalid quantity for ${product.name}`, 400);
      if (price < 0 || Number.isNaN(price)) throw new AppError(`Invalid price for ${product.name}`, 400);
      const lineTotal = Number((quantity * price).toFixed(2));
      totalAmount += lineTotal;
      enrichedItems.push({ product: product._id, name: product.name, sku: product.sku, quantity, price, lineTotal });
    }
    totalAmount = Number(totalAmount.toFixed(2));
    const paid = Math.min(Number(paidAmount) || 0, totalAmount);
    const due = Number((totalAmount - paid).toFixed(2));
    const paymentStatus = due <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
    const purchaseNumber = await generateNumber("purchase");

    const doc = new Purchase({
      purchaseNumber,
      supplier: supplierDoc?._id || null,
      items: enrichedItems,
      totalAmount,
      paidAmount: paid,
      dueAmount: due,
      paymentMethod,
      paymentStatus,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      notes,
      createdBy: user?._id || null,
    });
    await doc.save({ session });

    for (const line of enrichedItems) {
      const product = productMap.get(String(line.product));
      await recordStockMovement({
        product,
        type: "purchase",
        quantity: line.quantity,
        sign: 1,
        reason: `Purchase ${purchaseNumber}`,
        referenceType: "Purchase",
        reference: doc._id,
        user,
        date: purchaseDate ? new Date(purchaseDate) : new Date(),
        session,
      });
      product.purchasedQuantity = (product.purchasedQuantity || 0) + line.quantity;
      if (updateProductCost !== false) {
        product.purchasePrice = line.price;
      }
      await product.save({ session });
    }

    if (supplierDoc) {
      supplierDoc.totalPurchase = Number((supplierDoc.totalPurchase + totalAmount).toFixed(2));
      supplierDoc.totalPaid = Number((supplierDoc.totalPaid + paid).toFixed(2));
      supplierDoc.totalDue = Number((supplierDoc.totalDue + due).toFixed(2));
      await supplierDoc.save({ session });
    }

    if (paid > 0) {
      await createPayment({
        type: "purchase",
        direction: "out",
        amount: paid,
        method: paymentMethod,
        referenceType: "Purchase",
        reference: doc._id,
        supplier: supplierDoc?._id || null,
        description: `Payment for purchase ${purchaseNumber}`,
        paymentDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        user,
        session,
      });
    }

    return doc;
  });

  await checkAndNotifyLowStock(productMap.values());

  await createNotification({
    title: "Purchase created",
    message: `Purchase ${purchase.purchaseNumber} for ৳${purchase.totalAmount.toLocaleString()}`,
    type: "system",
    entityType: "Purchase",
    entity: purchase._id,
  });

  await logActivity({
    user,
    action: "created",
    entity: "Purchase",
    entityId: purchase._id,
    description: `Created purchase ${purchase.purchaseNumber} for ৳${purchase.totalAmount.toLocaleString()}`,
  });

  return purchase;
}

module.exports = { createPurchase };