const Return = require("../models/Return");
const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const AppError = require("../utils/AppError");
const { recordStockMovement, checkAndNotifyLowStock } = require("./stockService");
const { createPayment } = require("./accountingService");
const { logActivity } = require("./activityService");
const { createNotification } = require("./notificationService");
const { generateNumber } = require("./numberService");
const { runInTransaction } = require("../config/db");

async function createReturn({ body, user }) {
  const {
    sale: saleId,
    order: orderId,
    customer,
    items = [],
    reason = "Other",
    refundMethod = "Cash",
    account = null,
    refundStatus = "processed",
    returnDate,
    notes = "",
  } = body;

  if (!items || items.length === 0) throw new AppError("Return must contain at least one product", 400);

  let sale = null;
  let order = null;
  if (saleId) {
    sale = await Sale.findById(saleId);
    if (!sale) throw new AppError("Sale not found", 404);
    if (sale.status === "cancelled") throw new AppError("Cannot return a cancelled sale", 400);
  }
  if (orderId) {
    order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
  }

  const result = await runInTransaction(async (session) => {
    const source = sale || order;
    const sourceItems = source.items;
    const sourceItemMap = new Map(sourceItems.map((i) => [String(i.product), i]));

    const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).session(session);
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const returnItems = [];
    let totalRefund = 0;
    let totalCost = 0;
    let totalReturnedQuantity = 0;

    for (const item of items) {
      const product = productMap.get(String(item.product));
      if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
      const quantity = Number(item.quantity);
      if (!quantity || quantity < 1) throw new AppError("Invalid return quantity", 400);
      const srcItem = sourceItemMap.get(String(item.product));
      const availableToReturn = (srcItem?.quantity || 0) - (srcItem?.returnedQuantity || 0);
      if (availableToReturn < quantity) {
        throw new AppError(`Only ${availableToReturn} of ${product.name} can be returned from this ${sale ? "sale" : "order"}`, 400);
      }
      const refundPrice = Number(item.refundPrice) || (srcItem ? srcItem.sellingPrice : product.sellingPrice) || 0;
      const purchasePrice = Number(item.purchasePrice) || (srcItem ? srcItem.purchasePrice : product.purchasePrice) || 0;
      const condition = item.condition || "good";

      totalRefund += refundPrice * quantity;
      totalCost += purchasePrice * quantity;
      totalReturnedQuantity += quantity;

      if (condition === "good") {
        await recordStockMovement({
          product,
          type: "return",
          quantity,
          sign: 1,
          reason: `Return ${reason} (${sale ? sale.invoiceNumber : order.orderNumber})`,
          referenceType: "Return",
          user,
          date: returnDate ? new Date(returnDate) : new Date(),
          session,
        });
        product.soldQuantity = Math.max(0, (product.soldQuantity || 0) - quantity);
        product.soldRevenue = Math.max(0, (product.soldRevenue || 0) - refundPrice * quantity);
      } else {
        await recordStockMovement({
          product,
          type: "damage",
          quantity,
          sign: 0,
          previousStock: product.currentStock,
          reason: `Damaged return ${reason} (${sale ? sale.invoiceNumber : order.orderNumber})`,
          referenceType: "Return",
          user,
          date: returnDate ? new Date(returnDate) : new Date(),
          session,
        });
        product.soldQuantity = Math.max(0, (product.soldQuantity || 0) - quantity);
        product.soldRevenue = Math.max(0, (product.soldRevenue || 0) - refundPrice * quantity);
      }
      await product.save({ session });

      if (srcItem) {
        srcItem.returnedQuantity = (srcItem.returnedQuantity || 0) + quantity;
      }

      returnItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        size: item.size || srcItem?.size || "",
        quantity,
        refundPrice: Number(refundPrice.toFixed(2)),
        purchasePrice: Number(purchasePrice.toFixed(2)),
        reason: item.reason || reason,
        condition,
      });
    }

    totalRefund = Number(totalRefund.toFixed(2));
    totalCost = Number(totalCost.toFixed(2));
    const returnNumber = await generateNumber("return");

    const doc = new Return({
      returnNumber,
      sale: sale?._id || null,
      order: order?._id || null,
      customer: customer || sale?.customer || order?.customer || null,
      items: returnItems,
      totalRefundAmount: totalRefund,
      totalCost,
      reason,
      refundMethod,
      account,
      refundStatus,
      returnDate: returnDate ? new Date(returnDate) : new Date(),
      notes,
      createdBy: user?._id || null,
    });
    await doc.save({ session });

    if (sale) {
      sale.returnedAmount = Number((sale.returnedAmount || 0) + totalRefund).toFixed(2);
      sale.returnedQuantity = (sale.returnedQuantity || 0) + totalReturnedQuantity;
      await sale.save({ session });
    }
    if (order) {
      order.returnedAmount = Number((order.returnedAmount || 0) + totalRefund).toFixed(2);
      order.returnedQuantity = (order.returnedQuantity || 0) + totalReturnedQuantity;
      if (order.orderStatus === "Delivered" || order.orderStatus === "Shipped") {
        order.orderStatus = "Returned";
        order.timeline.push({
          status: "Returned",
          note: `Return created: ${returnNumber}`,
          by: user?._id || null,
          at: new Date(),
        });
      }
      await order.save({ session });
    }

    if (customer) {
      await Customer.updateOne({ _id: customer }, { $inc: { returnCount: 1 } }, { session });
    } else if (sale?.customer) {
      await Customer.updateOne({ _id: sale.customer }, { $inc: { returnCount: 1 } }, { session });
    } else if (order?.customer) {
      await Customer.updateOne({ _id: order.customer }, { $inc: { returnCount: 1 } }, { session });
    }

    if (refundStatus !== "pending" && totalRefund > 0) {
      await createPayment({
        type: "refund",
        direction: "out",
        amount: totalRefund,
        method: refundMethod,
        account,
        referenceType: "Return",
        reference: doc._id,
        customer: customer || sale?.customer || order?.customer || null,
        description: `Refund for return ${returnNumber}`,
        paymentDate: returnDate ? new Date(returnDate) : new Date(),
        user,
        session,
      });
    }

    return doc;
  });

  await checkAndNotifyLowStock((await Product.find({ _id: { $in: items.map((i) => i.product) } })).map((p) => ({ name: p.name, sku: p.sku, currentStock: p.currentStock, minimumStock: p.minimumStock, _id: p._id })));

  await createNotification({
    title: "Return created",
    message: `Return ${result.returnNumber} for ৳${result.totalRefundAmount.toLocaleString()}`,
    type: "return",
    entityType: "Return",
    entity: result._id,
  });

  await logActivity({
    user,
    action: "created",
    entity: "Return",
    entityId: result._id,
    description: `Created return ${result.returnNumber} (refund ৳${result.totalRefundAmount.toLocaleString()})`,
  });

  return result;
}

async function processReturn(refundId, { user, status }) {
  const refund = await Return.findById(refundId);
  if (!refund) throw new AppError("Return not found", 404);
  if (refund.refundStatus === "refunded") throw new AppError("Return is already refunded", 400);
  if (refund.refundStatus === status) return refund;

  const result = await runInTransaction(async (session) => {
    refund.refundStatus = status;
    await refund.save({ session });
    if (status === "refunded" && refund.totalRefundAmount > 0) {
      await createPayment({
        type: "refund",
        direction: "out",
        amount: refund.totalRefundAmount,
        method: refund.refundMethod,
        account: refund.account,
        referenceType: "Return",
        reference: refund._id,
        customer: refund.customer || null,
        description: `Refund for return ${refund.returnNumber}`,
        paymentDate: new Date(),
        user,
        session,
      });
    }
    return refund;
  });

  await logActivity({
    user,
    action: "status-changed",
    entity: "Return",
    entityId: refund._id,
    description: `Return ${refund.returnNumber} refund status set to ${status}`,
  });

  return result;
}

module.exports = { createReturn, processReturn };