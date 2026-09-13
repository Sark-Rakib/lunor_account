const Account = require("../models/Account");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { recomputeAccountBalances, getCashFlow } = require("../services/accountingService");
const { logActivity } = require("../services/activityService");
const { parseDateRange } = require("../utils/date");
const { ACCOUNT_TYPES } = require("../constants");

const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ active: true }).sort({ type: 1 });
  const total = accounts.reduce((s, a) => s + a.currentBalance, 0);
  sendSuccess(res, { accounts, totalBalance: Number(total.toFixed(2)) }, "Accounts fetched", 200);
});

const getAccount = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account) throw notFoundError("Account");
  sendSuccess(res, { account }, "Account fetched", 200);
});

const createAccount = asyncHandler(async (req, res) => {
  const { name, type, openingBalance = 0, note = "" } = req.body;
  if (!name || !type) throw new AppError("Name and type are required", 400);
  if (!ACCOUNT_TYPES.includes(type)) throw new AppError("Invalid account type", 400);
  const exists = await Account.findOne({ name });
  if (exists) throw new AppError("An account with this name already exists", 400);
  const account = await Account.create({ name, type, openingBalance: Number(openingBalance) || 0, currentBalance: Number(openingBalance) || 0, note });
  await logActivity({ user: req.user, action: "created", entity: "Account", entityId: account._id, description: `Created account ${account.name} (${account.type})` });
  sendSuccess(res, { account }, "Account created", 201);
});

const updateAccount = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account) throw notFoundError("Account");
  if (req.body.type && !ACCOUNT_TYPES.includes(req.body.type)) throw new AppError("Invalid account type", 400);
  if (req.body.openingBalance !== undefined && Number(req.body.openingBalance) !== account.openingBalance) {
    const delta = Number(req.body.openingBalance) - account.openingBalance;
    account.currentBalance = Number((account.currentBalance + delta).toFixed(2));
    account.openingBalance = Number(req.body.openingBalance);
  }
  if (req.body.name !== undefined) account.name = req.body.name;
  if (req.body.type !== undefined) account.type = req.body.type;
  if (req.body.note !== undefined) account.note = req.body.note;
  if (req.body.isDefault === true) {
    await Account.updateMany({}, { isDefault: false });
    account.isDefault = true;
  }
  await account.save();
  await logActivity({ user: req.user, action: "updated", entity: "Account", entityId: account._id, description: `Updated account ${account.name}` });
  sendSuccess(res, { account }, "Account updated", 200);
});

const deleteAccount = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account) throw notFoundError("Account");
  if (account.isDefault) throw new AppError("The default account cannot be deleted", 400);
  const { Payment } = require("../models");
  const used = await Payment.exists({ account: account._id });
  if (used) throw new AppError("Account has transactions and cannot be deleted. Deactivate it instead.", 400);
  account.active = false;
  await account.save();
  await logActivity({ user: req.user, action: "deleted", entity: "Account", entityId: account._id, description: `Deactivated account ${account.name}` });
  sendSuccess(res, {}, "Account deactivated", 200);
});

const recompute = asyncHandler(async (req, res) => {
  const totals = await recomputeAccountBalances();
  const accounts = await Account.find({ active: true }).sort({ type: 1 });
  sendSuccess(res, { accounts, totalBalance: totals.total }, "Balances recomputed", 200);
});

const cashFlow = asyncHandler(async (req, res) => {
  const { start, end, preset } = parseDateRange(req.query);
  const flow = await getCashFlow(start, end);
  sendSuccess(res, { flow, range: { start, end, preset } }, "Cash flow", 200);
});

const paymentHistory = asyncHandler(async (req, res) => {
  const { Payment } = require("../models");
  const { applyPagination, paginatedResponse } = require("../utils/pagination");
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.direction) filter.direction = req.query.direction;
  if (req.query.account) filter.account = req.query.account;
  if (req.query.from) filter.paymentDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.paymentDate = { ...(filter.paymentDate || {}), $lte: new Date(new Date(req.query.to).getTime() + 86399999) };

  const [docs, total] = await Promise.all([
    Payment.find(filter).populate("account", "name").populate("customer", "name").populate("supplier", "name").sort({ paymentDate: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);
  const agg = await Payment.aggregate([
    { $match: filter },
    { $group: { _id: "$direction", total: { $sum: "$amount" } } },
  ]);
  const inTotal = agg.find((a) => a._id === "in")?.total || 0;
  const outTotal = agg.find((a) => a._id === "out")?.total || 0;
  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Payment history", 200, { summary: { in: inTotal, out: outTotal } });
});

module.exports = { listAccounts, getAccount, createAccount, updateAccount, deleteAccount, recompute, cashFlow, paymentHistory };