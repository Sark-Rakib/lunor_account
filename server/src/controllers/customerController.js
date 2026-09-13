const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Return = require("../models/Return");
const Payment = require("../models/Payment");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createPayment } = require("../services/accountingService");
const { logActivity } = require("../services/activityService");

const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) {
    filter.$or = [{ name: buildSearchRegex(req.query.search) }, { phone: buildSearchRegex(req.query.search) }, { email: buildSearchRegex(req.query.search) }];
  }
  const [docs, total] = await Promise.all([
    Customer.find(filter).sort({ totalPurchased: -1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);
  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Customers fetched", 200);
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw notFoundError("Customer");
  const [sales, orders, returns, payments] = await Promise.all([
    Sale.find({ customer: customer._id }).populate("customer", "name phone").sort({ saleDate: -1 }).limit(50),
    Order.find({ customer: customer._id }).sort({ orderDate: -1 }).limit(50),
    Return.find({ customer: customer._id }).sort({ returnDate: -1 }).limit(20),
    Payment.find({ customer: customer._id }).sort({ paymentDate: -1 }).limit(20),
  ]);
  sendSuccess(res, { customer, sales, orders, returns, payments }, "Customer fetched", 200);
});

const createCustomer = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (phone) {
    const exists = await Customer.findOne({ phone });
    if (exists) throw new AppError("A customer with this phone number already exists", 400);
  }
  const customer = await Customer.create(req.body);
  await logActivity({ user: req.user, action: "created", entity: "Customer", entityId: customer._id, description: `Created customer ${customer.name}` });
  sendSuccess(res, { customer }, "Customer created", 201);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw notFoundError("Customer");
  Object.assign(customer, req.body);
  await customer.save();
  await logActivity({ user: req.user, action: "updated", entity: "Customer", entityId: customer._id, description: `Updated customer ${customer.name}` });
  sendSuccess(res, { customer }, "Customer updated", 200);
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw notFoundError("Customer");
  if (customer.totalOrders > 0) throw new AppError("Customer has order history and cannot be deleted", 400);
  await customer.deleteOne();
  await logActivity({ user: req.user, action: "deleted", entity: "Customer", entityId: customer._id, description: `Deleted customer ${customer.name}` });
  sendSuccess(res, {}, "Customer deleted", 200);
});

const recordCustomerPayment = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw notFoundError("Customer");
  const { amount, method = "Cash", date, note = "" } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new AppError("Enter a valid payment amount", 400);

  const payment = await createPayment({
    type: "customer-payment",
    direction: "in",
    amount: amt,
    method,
    referenceType: "Customer",
    reference: customer._id,
    customer: customer._id,
    description: note || `Payment received from ${customer.name}`,
    paymentDate: date ? new Date(date) : new Date(),
    user: req.user,
  });

  customer.totalPaid = Number((customer.totalPaid + amt).toFixed(2));
  customer.totalDue = Math.max(0, Number((customer.totalDue - amt).toFixed(2)));
  await customer.save();

  await logActivity({ user: req.user, action: "payment-recorded", entity: "Customer", entityId: customer._id, description: `Received ৳${amt.toLocaleString()} from ${customer.name}` });
  sendSuccess(res, { customer, payment }, "Payment recorded", 201);
});

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, recordCustomerPayment };