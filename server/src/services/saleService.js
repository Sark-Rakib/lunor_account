const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const AppError = require("../utils/AppError");
const { computeSaleTotals } = require("./finance");
const { recordStockMovement, checkAndNotifyLowStock } = require("./stockService");
const { createPayment } = require("./accountingService");
const { logActivity } = require("./activityService");
const { createNotification } = require("./notificationService");
const { generateNumber } = require("./numberService");
const { runInTransaction } = require("../config/db");

async function createSale({ body, user }) {
  const { customer, customerName = "", items = [], discount = 0, deliveryCharge = 0, paymentMethod = "Cash", paidAmount, saleDate, notes = "" } = body;

  if (!items || items.length === 0) throw new AppError("Sale must contain at least one product", 400);

  let customerDoc = null;
  if (customer) {
    customerDoc = await Customer.findById(customer);
    if (!customerDoc) throw new AppError("Customer not found", 404);
  }

  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const sale = await runInTransaction(async (session) => {
    const enrichedItems = [];
    for (const item of items) {
      const product = productMap.get(String(item.product));
      if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
      const quantity = Number(item.quantity);
      if (!quantity || quantity < 1) throw new AppError(`Invalid quantity for ${product.name}`, 400);
      if (product.currentStock < quantity) {
        throw new AppError(`Insufficient stock for ${product.name}: only ${product.currentStock} left`, 400);
      }
      enrichedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        size: item.size || "",
        quantity,
        purchasePrice: item.purchasePrice !== undefined && item.purchasePrice !== null && item.purchasePrice !== "" ? Number(item.purchasePrice) : product.purchasePrice,
        sellingPrice: item.sellingPrice !== undefined && item.sellingPrice !== null && item.sellingPrice !== "" ? Number(item.sellingPrice) : product.sellingPrice,
      });
    }

    const totals = computeSaleTotals(enrichedItems, discount, deliveryCharge);
    const paid = Math.min(Number(paidAmount) || 0, totals.total);
    const due = Number((totals.total - paid).toFixed(2));
    const paymentStatus = due <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

    const invoiceNumber = await generateNumber("invoice");

    const doc = new Sale({
      invoiceNumber,
      customer: customerDoc?._id || null,
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryCharge: totals.deliveryCharge,
      total: totals.total,
      productCost: totals.productCost,
      profit: totals.profit,
      paymentMethod,
      paymentStatus,
      paidAmount: paid,
      dueAmount: due,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      notes,
      createdBy: user?._id || null,
    });
    await doc.save({ session });

    for (const line of totals.items) {
      const product = productMap.get(String(line.product));
      await recordStockMovement({
        product,
        type: "sale",
        quantity: line.quantity,
        sign: -1,
        reason: `Sale ${invoiceNumber}`,
        referenceType: "Sale",
        reference: doc._id,
        user,
        date: saleDate ? new Date(saleDate) : new Date(),
        session,
      });
      product.soldQuantity = (product.soldQuantity || 0) + line.quantity;
      product.soldRevenue = (product.soldRevenue || 0) + line.lineTotal;
      await product.save({ session });
    }

    if (customerDoc) {
      customerDoc.totalOrders += 1;
      customerDoc.totalPurchased = Number((customerDoc.totalPurchased + totals.total).toFixed(2));
      customerDoc.totalPaid = Number((customerDoc.totalPaid + paid).toFixed(2));
      customerDoc.totalDue = Number((customerDoc.totalDue + due).toFixed(2));
      customerDoc.lastOrder = saleDate ? new Date(saleDate) : new Date();
      await customerDoc.save({ session });
    }

    if (paid > 0) {
      await createPayment({
        type: "sale",
        direction: "in",
        amount: paid,
        method: paymentMethod,
        referenceType: "Sale",
        reference: doc._id,
      customer: customerDoc?._id || null,
      customerName: (customerName || customerDoc?.name || "").trim(),
        description: `Payment for sale ${invoiceNumber}`,
        paymentDate: saleDate ? new Date(saleDate) : new Date(),
        user,
        session,
      });
    }

    return doc;
  });

  await checkAndNotifyLowStock(productMap.values());

  await createNotification({
    title: "Sale created",
    message: `New sale ${sale.invoiceNumber} worth ৳${sale.total.toLocaleString()}`,
    type: "order",
    entityType: "Sale",
    entity: sale._id,
  });

  await logActivity({
    user,
    action: "created",
    entity: "Sale",
    entityId: sale._id,
    description: `Created sale ${sale.invoiceNumber} for ৳${sale.total.toLocaleString()}`,
    details: { total: sale.total },
  });

  return sale;
}

async function cancelSale(id, { user }) {
  const sale = await Sale.findById(id);
  if (!sale) throw new AppError("Sale not found", 404);
  if (sale.status === "cancelled") throw new AppError("Sale is already cancelled", 400);
  if (sale.returnedQuantity > 0) {
    throw new AppError("This sale has returns. Cancel via the Returns module instead.", 400);
  }

  const result = await runInTransaction(async (session) => {
    const productIds = sale.items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    for (const line of sale.items) {
      const product = productMap.get(String(line.product));
      if (!product) continue;
      await recordStockMovement({
        product,
        type: "return",
        quantity: line.quantity,
        sign: 1,
        reason: `Sale cancelled ${sale.invoiceNumber}`,
        referenceType: "Sale",
        reference: sale._id,
        user,
        date: new Date(),
        session,
      });
      product.soldQuantity = Math.max(0, (product.soldQuantity || 0) - line.quantity);
      product.soldRevenue = Math.max(0, (product.soldRevenue || 0) - line.lineTotal);
      await product.save({ session });
    }

    if (sale.customer) {
      await Customer.updateOne(
        { _id: sale.customer },
        {
          $inc: {
            totalOrders: -1,
            totalPurchased: -sale.total,
            totalPaid: -sale.paidAmount,
            totalDue: -sale.dueAmount,
          },
        },
        { session }
      );
    }

    if (sale.paidAmount > 0) {
      await createPayment({
        type: "refund",
        direction: "out",
        amount: sale.paidAmount,
        method: sale.paymentMethod,
        referenceType: "Sale",
        reference: sale._id,
        customer: sale.customer || null,
        description: `Refund for cancelled sale ${sale.invoiceNumber}`,
        user,
        session,
      });
    }

    sale.status = "cancelled";
    sale.paidAmount = 0;
    sale.dueAmount = 0;
    await sale.save({ session });
    return sale;
  });

  await logActivity({
    user,
    action: "cancelled",
    entity: "Sale",
    entityId: sale._id,
    description: `Cancelled sale ${sale.invoiceNumber}`,
  });

  return result;
}

module.exports = { createSale, cancelSale };