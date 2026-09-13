const Purchase = require("../models/Purchase");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createPurchase } = require("../services/purchaseService");

const listPurchases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) filter.purchaseNumber = buildSearchRegex(req.query.search);
  if (req.query.supplier) filter.supplier = req.query.supplier;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.from) filter.purchaseDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.purchaseDate = { ...(filter.purchaseDate || {}), $lte: new Date(new Date(req.query.to).getTime() + 86399999) };

  const [docs, total] = await Promise.all([
    Purchase.find(filter).populate("supplier", "name company").sort({ purchaseDate: -1 }).skip(skip).limit(limit),
    Purchase.countDocuments(filter),
  ]);

  const sums = await Purchase.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$totalAmount" }, paid: { $sum: "$paidAmount" }, due: { $sum: "$dueAmount" } } },
  ]);

  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Purchases fetched", 200, {
    summary: sums[0] ? { total: sums[0].total, paid: sums[0].paid, due: sums[0].due } : { total: 0, paid: 0, due: 0 },
  });
});

const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id).populate("supplier", "name company phone").populate("createdBy", "name");
  if (!purchase) throw notFoundError("Purchase");
  sendSuccess(res, { purchase }, "Purchase fetched", 200);
});

const createPurchaseHandler = asyncHandler(async (req, res) => {
  const purchase = await createPurchase({ body: req.body, user: req.user });
  sendSuccess(res, { purchase }, "Purchase created successfully", 201);
});

module.exports = { listPurchases, getPurchase, createPurchaseHandler };