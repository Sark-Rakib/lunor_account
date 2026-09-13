const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const AppError = require("../utils/AppError");
const { computeSaleTotals } = require("./finance");
const { recordStockMovement, checkAndNotifyLowStock } = require("./stockService");
const { createPayment } = require("./accountingService");
const { logActivity } = require("./activityService");
const { createNotification } = require("./notificationService");
const { generateNumber, getSettings } = require("./numberService");
const { runInTransaction } = require("../config/db");
const { ORDER_FLOW, ORDER_STATUSES } = require("../constants");

const REVENUE_STATUSES = ["Shipped", "Delivered"];
const STOCK_STATUSES = ["Confirmed", "Processing", "Shipped", "Delivered"];

async function createOrder({ body, user }) {
  const {
    customer,
    items = [],
    discount = 0,
    deliveryCharge = 0,
    paymentMethod = "Cash",
    paidAmount = 0,
    orderStatus,
    orderDate,
    notes = "",
  } = body;

  if (!items || items.length === 0) throw new AppError("Order must contain at least one product", 400);

  const settings = await getSettings();
  const status = orderStatus || settings.orderSettings.defaultStatus || "Pending";

  let customerDoc = null;
  if (customer) {
    customerDoc = await Customer.findById(customer);
    if (!customerDoc) throw new AppError("Customer not found", 404);
  }

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const order = await runInTransaction(async (session) => {
    const enrichedItems = [];
    for (const item of items) {
      const product = productMap.get(String(item.product));
      if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
      const quantity = Number(item.quantity);
      if (!quantity || quantity < 1) throw new AppError(`Invalid quantity for ${product.name}`, 400);

      const shouldDeduct = STOCK_STATUSES.includes(status);
      if (shouldDeduct && product.currentStock < quantity) {
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
    const orderNumber = await generateNumber("order");
    const recognized = REVENUE_STATUSES.includes(status);

    const doc = new Order({
      orderNumber,
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
      orderStatus: status,
      timeline: [{ status, note: "Order created", by: user?._id || null }],
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      notes,
      revenueRecognized: recognized,
      stockDeducted: shouldDeduct(status),
      createdBy: user?._id || null,
    });
    if (status === "Delivered") doc.deliveredAt = new Date();
    await doc.save({ session });

    if (STOCK_STATUSES.includes(status)) {
      for (const line of totals.items) {
        const product = productMap.get(String(line.product));
        await recordStockMovement({
          product,
          type: "sale",
          quantity: line.quantity,
          sign: -1,
          reason: `Order ${orderNumber} (${status})`,
          referenceType: "Order",
          reference: doc._id,
          user,
          date: orderDate ? new Date(orderDate) : new Date(),
          session,
        });
        product.soldQuantity = (product.soldQuantity || 0) + line.quantity;
        product.soldRevenue = (product.soldRevenue || 0) + line.lineTotal;
        await product.save({ session });
      }
    }

    if (customerDoc) {
      customerDoc.totalOrders += 1;
      customerDoc.totalPurchased = Number((customerDoc.totalPurchased + totals.total).toFixed(2));
      customerDoc.totalPaid = Number((customerDoc.totalPaid + paid).toFixed(2));
      customerDoc.totalDue = Number((customerDoc.totalDue + due).toFixed(2));
      customerDoc.lastOrder = orderDate ? new Date(orderDate) : new Date();
      await customerDoc.save({ session });
    }

    if (paid > 0) {
      await createPayment({
        type: "order",
        direction: "in",
        amount: paid,
        method: paymentMethod,
        referenceType: "Order",
        reference: doc._id,
        customer: customerDoc?._id || null,
        description: `Payment for order ${orderNumber}`,
        paymentDate: orderDate ? new Date(orderDate) : new Date(),
        user,
        session,
      });
    }

    return doc;
  });

  await checkAndNotifyLowStock(productMap.values());

  await createNotification({
    title: "New order",
    message: `Order ${order.orderNumber} created for ৳${order.total.toLocaleString()}`,
    type: "order",
    entityType: "Order",
    entity: order._id,
  });

  await logActivity({
    user,
    action: "created",
    entity: "Order",
    entityId: order._id,
    description: `Created order ${order.orderNumber} (${order.orderStatus})`,
  });

  return order;
}

function shouldDeduct(status) {
  return STOCK_STATUSES.includes(status);
}

async function updateOrderStatus(orderId, status, { user, reason = "" } = {}) {
  if (!ORDER_STATUSES.includes(status)) throw new AppError("Invalid order status", 400);

  const order = await Order.findById(orderId).populate("items.product");
  if (!order) throw new AppError("Order not found", 404);

  if (order.orderStatus === status) {
    throw new AppError(`Order is already ${status}`, 400);
  }

  if (status === "Returned" || status === "Refunded") {
    throw new AppError(
      "Use the Returns module to mark an order as Returned/Refunded so inventory and finances stay consistent.",
      400
    );
  }

  const currentIdx = ORDER_FLOW.indexOf(order.orderStatus);
  const nextIdx = ORDER_FLOW.indexOf(status);
  if (currentIdx > -1 && nextIdx > -1 && nextIdx < currentIdx) {
    throw new AppError(`Cannot move order backwards from ${order.orderStatus} to ${status}`, 400);
  }
  if (currentIdx === -1 && ORDER_FLOW.includes(status)) {
    throw new AppError(`Cannot move order from ${order.orderStatus} to ${status}`, 400);
  }

  const result = await runInTransaction(async (session) => {
    const wasDeducted = order.stockDeducted;
    const shouldDeductNow = STOCK_STATUSES.includes(status);
    const productIds = order.items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    if (status === "Cancelled") {
      if (wasDeducted) {
        for (const line of order.items) {
          const product = productMap.get(String(line.product));
          if (!product) continue;
          await recordStockMovement({
            product,
            type: "return",
            quantity: line.quantity,
            sign: 1,
            reason: `Order cancelled ${order.orderNumber}`,
            referenceType: "Order",
            reference: order._id,
            user,
            date: new Date(),
            session,
          });
          product.soldQuantity = Math.max(0, (product.soldQuantity || 0) - line.quantity);
          product.soldRevenue = Math.max(0, (product.soldRevenue || 0) - line.lineTotal);
          await product.save({ session });
        }
      }
      order.stockDeducted = false;

      if (order.revenueRecognized) {
        order.revenueRecognized = false;
        order.deliveredAt = null;
        if (order.customer) {
          await Customer.updateOne(
            { _id: order.customer },
            {
              $inc: {
                totalOrders: -1,
                totalPurchased: -order.total,
                totalPaid: -order.paidAmount,
                totalDue: -order.dueAmount,
              },
            },
            { session }
          );
        }
        if (order.paidAmount > 0) {
          await createPayment({
            type: "refund",
            direction: "out",
            amount: order.paidAmount,
            method: order.paymentMethod,
            referenceType: "Order",
            reference: order._id,
            customer: order.customer || null,
            description: `Refund for cancelled order ${order.orderNumber}`,
            user,
            session,
          });
        }
        order.paidAmount = 0;
        order.dueAmount = 0;
      }
    } else {
      if (!wasDeducted && shouldDeductNow) {
        for (const line of order.items) {
          const product = productMap.get(String(line.product));
          if (product.currentStock < line.quantity) {
            throw new AppError(`Insufficient stock for ${product.name}: only ${product.currentStock} left`, 400);
          }
        }
        for (const line of order.items) {
          const product = productMap.get(String(line.product));
          await recordStockMovement({
            product,
            type: "sale",
            quantity: line.quantity,
            sign: -1,
            reason: `Order ${order.orderNumber} (${status})`,
            referenceType: "Order",
            reference: order._id,
            user,
            date: new Date(),
            session,
          });
          product.soldQuantity = (product.soldQuantity || 0) + line.quantity;
          product.soldRevenue = (product.soldRevenue || 0) + line.lineTotal;
          await product.save({ session });
        }
        order.stockDeducted = true;
      }
      if (!order.revenueRecognized && REVENUE_STATUSES.includes(status)) {
        order.revenueRecognized = true;
        if (status === "Delivered") order.deliveredAt = new Date();
      }
    }

    order.orderStatus = status;
    order.timeline.push({
      status,
      note: reason || `Status changed to ${status}`,
      by: user?._id || null,
      at: new Date(),
    });
    await order.save({ session });
    return order;
  });

  if (order.stockDeducted) {
    await checkAndNotifyLowStock(
      order.items.map((i) => i.product)
    );
  }

  await createNotification({
    title: "Order status changed",
    message: `Order ${result.orderNumber} is now ${result.orderStatus}`,
    type: "order",
    entityType: "Order",
    entity: result._id,
  });

  await logActivity({
    user,
    action: "status-changed",
    entity: "Order",
    entityId: result._id,
    description: `Order ${result.orderNumber} status changed to ${result.orderStatus}`,
    details: { from: order.orderStatus, to: result.orderStatus },
  });

  return result;
}

module.exports = { createOrder, updateOrderStatus };