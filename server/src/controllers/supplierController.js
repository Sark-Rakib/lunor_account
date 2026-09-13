const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");
const Payment = require("../models/Payment");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createPayment } = require("../services/accountingService");
const { logActivity } = require("../services/activityService");

const listSuppliers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) {
    filter.$or = [{ name: buildSearchRegex(req.query.search) }, { phone: buildSearchRegex(req.query.search) }, { company: buildSearchRegex(req.query.search) }];
  }
  const [docs, total] = await Promise.all([
    Supplier.find(filter).sort({ totalPurchase: -1 }).skip(skip).limit(limit),
    Supplier.countDocuments(filter),
  ]);
  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Suppliers fetched", 200);
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw notFoundError("Supplier");
  const [purchases, payments] = await Promise.all([
    Purchase.find({ supplier: supplier._id }).sort({ purchaseDate: -1 }).limit(50),
    Payment.find({ supplier: supplier._id }).sort({ paymentDate: -1 }).limit(50),
  ]);
  sendSuccess(res, { supplier, purchases, payments }, "Supplier fetched", 200);
});

const createSupplier = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (phone) {
    const exists = await Supplier.findOne({ phone });
    if (exists) throw new AppError("A supplier with this phone number already exists", 400);
  }
  const supplier = await Supplier.create(req.body);
  await logActivity({ user: req.user, action: "created", entity: "Supplier", entityId: supplier._id, description: `Created supplier ${supplier.name}` });
  sendSuccess(res, { supplier }, "Supplier created", 201);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw notFoundError("Supplier");
  Object.assign(supplier, req.body);
  await supplier.save();
  await logActivity({ user: req.user, action: "updated", entity: "Supplier", entityId: supplier._id, description: `Updated supplier ${supplier.name}` });
  sendSuccess(res, { supplier }, "Supplier updated", 200);
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw notFoundError("Supplier");
  if (supplier.totalPurchase > 0) throw new AppError("Supplier has purchase history and cannot be deleted", 400);
  await supplier.deleteOne();
  await logActivity({ user: req.user, action: "deleted", entity: "Supplier", entityId: supplier._id, description: `Deleted supplier ${supplier.name}` });
  sendSuccess(res, {}, "Supplier deleted", 200);
});

const recordSupplierPayment = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw notFoundError("Supplier");
  const { amount, method = "Cash", date, note = "" } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new AppError("Enter a valid payment amount", 400);

  const payment = await createPayment({
    type: "supplier-payment",
    direction: "out",
    amount: amt,
    method,
    referenceType: "Supplier",
    reference: supplier._id,
    supplier: supplier._id,
    description: note || `Payment to ${supplier.name}`,
    paymentDate: date ? new Date(date) : new Date(),
    user: req.user,
  });

  supplier.totalPaid = Number((supplier.totalPaid + amt).toFixed(2));
  supplier.totalDue = Math.max(0, Number((supplier.totalDue - amt).toFixed(2)));
  await supplier.save();

  await logActivity({ user: req.user, action: "payment-recorded", entity: "Supplier", entityId: supplier._id, description: `Paid ৳${amt.toLocaleString()} to ${supplier.name}` });
  sendSuccess(res, { supplier, payment }, "Payment recorded", 201);
});

module.exports = { listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier, recordSupplierPayment };