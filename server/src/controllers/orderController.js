const Order = require("../models/Order");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createOrder, updateOrderStatus } = require("../services/orderService");
const { logActivity } = require("../services/activityService");
const { ORDER_STATUSES } = require("../constants");

const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) filter.orderNumber = buildSearchRegex(req.query.search);
  if (req.query.orderStatus) filter.orderStatus = req.query.orderStatus;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.from) filter.orderDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.orderDate = { ...(filter.orderDate || {}), $lte: new Date(new Date(req.query.to).getTime() + 86399999) };

  const [docs, total] = await Promise.all([
    Order.find(filter).populate("customer", "name phone").sort({ orderDate: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  const sums = await Order.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$total" }, cost: { $sum: "$productCost" }, profit: { $sum: "$profit" }, due: { $sum: "$dueAmount" } } },
  ]);

  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Orders fetched", 200, {
    summary: sums[0]
      ? { total: sums[0].total, cost: sums[0].cost, profit: sums[0].profit, due: sums[0].due }
      : { total: 0, cost: 0, profit: 0, due: 0 },
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("customer", "name phone email address")
    .populate("createdBy", "name")
    .populate("timeline.by", "name");
  if (!order) throw notFoundError("Order");
  sendSuccess(res, { order }, "Order fetched", 200);
});

const createOrderHandler = asyncHandler(async (req, res) => {
  const order = await createOrder({ body: req.body, user: req.user });
  sendSuccess(res, { order }, "Order created successfully", 201);
});

const changeStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  if (!ORDER_STATUSES.includes(status)) throw new AppError("Invalid order status", 400);
  const order = await updateOrderStatus(req.params.id, status, { user: req.user, reason });
  sendSuccess(res, { order }, "Order status updated", 200);
});

const editOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFoundError("Order");
  if (order.orderStatus !== "Pending") {
    throw new AppError("Only pending orders can be edited. Cancel and recreate for other statuses.", 400);
  }
  if (order.stockDeducted) throw new AppError("This order already reserved stock and cannot be edited", 400);
  const { notes } = req.body;
  if (notes !== undefined) order.notes = notes;
  if (req.body.discount !== undefined) order.discount = Number(req.body.discount);
  if (req.body.deliveryCharge !== undefined) order.deliveryCharge = Number(req.body.deliveryCharge);
  order.total = Number((order.subtotal - order.discount + order.deliveryCharge).toFixed(2));
  order.profit = Number((order.total - order.productCost).toFixed(2));
  await order.save();
  await logActivity({ user: req.user, action: "updated", entity: "Order", entityId: order._id, description: `Updated order ${order.orderNumber}` });
  sendSuccess(res, { order }, "Order updated", 200);
});

module.exports = { listOrders, getOrder, createOrderHandler, changeStatus, editOrder };