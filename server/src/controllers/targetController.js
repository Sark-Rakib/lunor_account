const Target = require("../models/Target");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { summaryInRange } = require("../services/finance");
const { logActivity } = require("../services/activityService");
const dayjs = require("dayjs");

function monthRange(month) {
  const start = dayjs(month + "-01").startOf("month").toDate();
  const end = dayjs(month + "-01").endOf("month").toDate();
  return { start, end };
}

const listTargets = asyncHandler(async (req, res) => {
  const targets = await Target.find().sort({ month: -1 }).limit(24);
  sendSuccess(res, { targets }, "Targets fetched", 200);
});

const getTarget = asyncHandler(async (req, res) => {
  const { month } = req.query;
  let target = null;
  if (month) {
    target = await Target.findOne({ month });
    if (!target) target = new Target({ month, createdBy: req.user._id });
  } else {
    target = await Target.findOne({}).sort({ month: -1 });
    if (!target) target = new Target({ month: dayjs().format("YYYY-MM"), createdBy: req.user._id });
  }

  const { start, end } = monthRange(target.month);
  const actual = await summaryInRange(start, end);

  const progress = {
    revenue: { target: target.revenueTarget || 0, current: actual.revenue, percent: target.revenueTarget ? Math.min(100, Number(((actual.revenue / target.revenueTarget) * 100).toFixed(1))) : 0 },
    orders: { target: target.orderTarget || 0, current: actual.salesCount + actual.ordersCount, percent: target.orderTarget ? Math.min(100, Number((((actual.salesCount + actual.ordersCount) / target.orderTarget) * 100).toFixed(1))) : 0 },
    products: { target: target.productSalesTarget || 0, current: actual.soldQuantity, percent: target.productSalesTarget ? Math.min(100, Number(((actual.soldQuantity / target.productSalesTarget) * 100).toFixed(1))) : 0 },
    profit: { target: target.profitTarget || 0, current: actual.netProfit, percent: target.profitTarget ? Math.min(100, Number(((actual.netProfit / target.profitTarget) * 100).toFixed(1))) : 0 },
  };

  sendSuccess(res, { target, progress, month: target.month }, "Target fetched", 200);
});

const saveTarget = asyncHandler(async (req, res) => {
  const { month, revenueTarget = 0, orderTarget = 0, productSalesTarget = 0, profitTarget = 0 } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) throw new AppError("Valid month (YYYY-MM) is required", 400);

  let target = await Target.findOne({ month });
  if (!target) target = new Target({ month, createdBy: req.user._id });
  target.revenueTarget = Number(revenueTarget) || 0;
  target.orderTarget = Number(orderTarget) || 0;
  target.productSalesTarget = Number(productSalesTarget) || 0;
  target.profitTarget = Number(profitTarget) || 0;
  await target.save();

  await logActivity({ user: req.user, action: "updated", entity: "Target", entityId: target._id, description: `Updated targets for ${month}` });
  sendSuccess(res, { target }, "Target saved", 200);
});

module.exports = { listTargets, getTarget, saveTarget };