const Expense = require("../models/Expense");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createPayment } = require("../services/accountingService");
const { logActivity } = require("../services/activityService");
const { runInTransaction } = require("../config/db");
const { EXPENSE_CATEGORIES } = require("../constants");

const listExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) {
    filter.$or = [{ title: buildSearchRegex(req.query.search) }, { description: buildSearchRegex(req.query.search) }];
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.from) filter.expenseDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.expenseDate = { ...(filter.expenseDate || {}), $lte: new Date(new Date(req.query.to).getTime() + 86399999) };

  const [docs, total] = await Promise.all([
    Expense.find(filter).populate("account", "name").sort({ expenseDate: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter),
  ]);

  const sums = await Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]);

  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Expenses fetched", 200, {
    summary: sums[0] ? { total: sums[0].total, count: sums[0].count } : { total: 0, count: 0 },
  });
});

const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id).populate("account", "name");
  if (!expense) throw notFoundError("Expense");
  sendSuccess(res, { expense }, "Expense fetched", 200);
});

const createExpense = asyncHandler(async (req, res) => {
  const { title, category, amount, paymentMethod = "Cash", account, expenseDate, description = "" } = req.body;
  if (!title || !category) throw new AppError("Title and category are required", 400);
  if (!EXPENSE_CATEGORIES.includes(category)) throw new AppError("Invalid expense category", 400);
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new AppError("Amount must be a positive number", 400);

  const expense = await runInTransaction(async (session) => {
    const doc = await Expense.create({
      title,
      category,
      amount: amt,
      paymentMethod,
      account: account || null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      description,
      createdBy: req.user._id,
    });
    await createPayment({
      type: "expense",
      direction: "out",
      amount: amt,
      method: paymentMethod,
      account,
      referenceType: "Expense",
      reference: doc._id,
      description: `${category}: ${title}`,
      paymentDate: expenseDate ? new Date(expenseDate) : new Date(),
      user: req.user,
      session,
    });
    return doc;
  });

  await logActivity({ user: req.user, action: "created", entity: "Expense", entityId: expense._id, description: `Added expense ${title} (৳${amt.toLocaleString()})` });
  sendSuccess(res, { expense }, "Expense added", 201);
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw notFoundError("Expense");
  const oldAmount = expense.amount;
  Object.assign(expense, req.body);
  if (req.body.amount !== undefined) expense.amount = Number(req.body.amount);
  if (req.body.expenseDate) expense.expenseDate = new Date(req.body.expenseDate);
  if (req.body.category && !EXPENSE_CATEGORIES.includes(req.body.category)) throw new AppError("Invalid expense category", 400);

  const delta = expense.amount - oldAmount;
  if (delta !== 0) {
    await createPayment({
      type: delta > 0 ? "expense" : "refund",
      direction: delta > 0 ? "out" : "in",
      amount: Math.abs(delta),
      method: req.body.paymentMethod || expense.paymentMethod,
      account: req.body.account || expense.account,
      referenceType: "Expense",
      reference: expense._id,
      description: `${delta > 0 ? "Additional expense" : "Expense adjustment"} for ${expense.title}`,
      paymentDate: expense.expenseDate,
      user: req.user,
    });
  }

  await expense.save();
  await logActivity({ user: req.user, action: "updated", entity: "Expense", entityId: expense._id, description: `Updated expense ${expense.title}` });
  sendSuccess(res, { expense }, "Expense updated", 200);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw notFoundError("Expense");
  await createPayment({
    type: "refund",
    direction: "in",
    amount: expense.amount,
    method: expense.paymentMethod,
    account: expense.account,
    referenceType: "Expense",
    reference: expense._id,
    description: `Reversal: deleted expense ${expense.title}`,
    paymentDate: new Date(),
    user: req.user,
  });
  await expense.deleteOne();
  await logActivity({ user: req.user, action: "deleted", entity: "Expense", entityId: expense._id, description: `Deleted expense ${expense.title}` });
  sendSuccess(res, {}, "Expense deleted", 200);
});

module.exports = { listExpenses, getExpense, createExpense, updateExpense, deleteExpense };