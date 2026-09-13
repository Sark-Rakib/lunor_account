const Return = require("../models/Return");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createReturn, processReturn } = require("../services/returnService");
const { RETURN_STATUSES } = require("../constants");

const listReturns = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) filter.returnNumber = buildSearchRegex(req.query.search);
  if (req.query.reason) filter.reason = req.query.reason;
  if (req.query.refundStatus) filter.refundStatus = req.query.refundStatus;
  if (req.query.from) filter.returnDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.returnDate = { ...(filter.returnDate || {}), $lte: new Date(new Date(req.query.to).getTime() + 86399999) };

  const [docs, total] = await Promise.all([
    Return.find(filter).populate("sale", "invoiceNumber").populate("order", "orderNumber").populate("customer", "name").sort({ returnDate: -1 }).skip(skip).limit(limit),
    Return.countDocuments(filter),
  ]);

  const sums = await Return.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$totalRefundAmount" }, count: { $sum: 1 } } },
  ]);

  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Returns fetched", 200, {
    summary: sums[0] ? { total: sums[0].total, count: sums[0].count } : { total: 0, count: 0 },
  });
});

const getReturn = asyncHandler(async (req, res) => {
  const refund = await Return.findById(req.params.id)
    .populate("sale", "invoiceNumber")
    .populate("order", "orderNumber")
    .populate("customer", "name phone")
    .populate("createdBy", "name");
  if (!refund) throw notFoundError("Return");
  sendSuccess(res, { return: refund }, "Return fetched", 200);
});

const createReturnHandler = asyncHandler(async (req, res) => {
  const refund = await createReturn({ body: req.body, user: req.user });
  sendSuccess(res, { return: refund }, "Return processed", 201);
});

const updateReturnStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!RETURN_STATUSES.includes(status)) throw new AppError("Invalid refund status", 400);
  const refund = await processReturn(req.params.id, { user: req.user, status });
  sendSuccess(res, { return: refund }, "Return status updated", 200);
});

module.exports = { listReturns, getReturn, createReturnHandler, updateReturnStatus };