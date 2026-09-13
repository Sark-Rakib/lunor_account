const Income = require("../models/Income");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createPayment } = require("../services/accountingService");
const { logActivity } = require("../services/activityService");
const { INCOME_CATEGORIES } = require("../constants");

const listIncomes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) filter.title = buildSearchRegex(req.query.search);
  if (req.query.category) filter.category = req.query.category;
  if (req.query.from) filter.incomeDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.incomeDate = { ...(filter.incomeDate || {}), $lte: new Date(new Date(req.query.to).getTime() + 86399999) };

  const [docs, total] = await Promise.all([
    Income.find(filter).sort({ incomeDate: -1 }).skip(skip).limit(limit),
    Income.countDocuments(filter),
  ]);

  const sums = await Income.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]);

  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Incomes fetched", 200, {
    summary: sums[0] ? { total: sums[0].total, count: sums[0].count } : { total: 0, count: 0 },
  });
});

const getIncome = asyncHandler(async (req, res) => {
  const income = await Income.findById(req.params.id);
  if (!income) throw notFoundError("Income");
  sendSuccess(res, { income }, "Income fetched", 200);
});

const createIncome = asyncHandler(async (req, res) => {
  const { title, category, amount, paymentMethod = "Cash", account, incomeDate, notes = "" } = req.body;
  if (!title || !category) throw new AppError("Title and category are required", 400);
  if (!INCOME_CATEGORIES.includes(category)) throw new AppError("Invalid income category", 400);
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new AppError("Amount must be a positive number", 400);

  const income = await Income.create({
    title, category, amount: amt, paymentMethod, account, incomeDate: incomeDate ? new Date(incomeDate) : new Date(), notes, createdBy: req.user._id,
  });
  await createPayment({
    type: "income", direction: "in", amount: amt, method: paymentMethod, account, referenceType: "Income", reference: income._id, description: `${category}: ${title}`, paymentDate: incomeDate ? new Date(incomeDate) : new Date(), user: req.user,
  });

  await logActivity({ user: req.user, action: "created", entity: "Income", entityId: income._id, description: `Added income ${title} (৳${amt.toLocaleString()})` });
  sendSuccess(res, { income }, "Income added", 201);
});

const updateIncome = asyncHandler(async (req, res) => {
  const income = await Income.findById(req.params.id);
  if (!income) throw notFoundError("Income");
  const oldAmount = income.amount;
  Object.assign(income, req.body);
  if (req.body.amount !== undefined) income.amount = Number(req.body.amount);
  if (req.body.incomeDate) income.incomeDate = new Date(req.body.incomeDate);
  if (req.body.category && !INCOME_CATEGORIES.includes(req.body.category)) throw new AppError("Invalid income category", 400);

  const delta = income.amount - oldAmount;
  if (delta !== 0) {
    await createPayment({
      type: delta > 0 ? "income" : "refund",
      direction: delta > 0 ? "in" : "out",
      amount: Math.abs(delta),
      method: income.paymentMethod,
      account: income.account,
      referenceType: "Income",
      reference: income._id,
      description: `${delta > 0 ? "Additional income" : "Income adjustment"} for ${income.title}`,
      paymentDate: income.incomeDate,
      user: req.user,
    });
  }
  await income.save();
  await logActivity({ user: req.user, action: "updated", entity: "Income", entityId: income._id, description: `Updated income ${income.title}` });
  sendSuccess(res, { income }, "Income updated", 200);
});

const deleteIncome = asyncHandler(async (req, res) => {
  const income = await Income.findById(req.params.id);
  if (!income) throw notFoundError("Income");
  await createPayment({
    type: "refund", direction: "out", amount: income.amount, method: income.paymentMethod, account: income.account,
    referenceType: "Income", reference: income._id, description: `Reversal: deleted income ${income.title}`, paymentDate: new Date(), user: req.user,
  });
  await income.deleteOne();
  await logActivity({ user: req.user, action: "deleted", entity: "Income", entityId: income._id, description: `Deleted income ${income.title}` });
  sendSuccess(res, {}, "Income deleted", 200);
});

module.exports = { listIncomes, getIncome, createIncome, updateIncome, deleteIncome };