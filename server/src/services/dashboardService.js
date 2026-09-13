const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Expense = require("../models/Expense");
const Return = require("../models/Return");
const Product = require("../models/Product");
const Account = require("../models/Account");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const { summaryInRange, receivablesTotals, salesSummaryInRange } = require("./finance");
const { getCashFlow } = require("./accountingService");
const { parseDateRange, previousPeriod, compareValue, dayjs, TIMEZONE, endOfDay, DATE_PRESETS } = require("../utils/date");

function bucketKey(date, range) {
  const d = dayjs(date).tz(TIMEZONE);
  const days = Math.max(1, Math.round((range.end - range.start) / (1000 * 60 * 60 * 24)));
  if (days > 90) return d.format("YYYY-MM");
  return d.format("YYYY-MM-DD");
}

function fillBuckets(range) {
  const buckets = [];
  const days = Math.max(1, Math.round((range.end - range.start) / (1000 * 60 * 60 * 24) + 1));
  let cursor = dayjs(range.start).tz(TIMEZONE).startOf("day");
  const step = days > 90 ? "month" : "day";
  let guard = 0;
  while (cursor.isBefore(dayjs(range.end)) && guard < 400) {
    const key = step === "month" ? cursor.format("YYYY-MM") : cursor.format("YYYY-MM-DD");
    buckets.push({ key, label: step === "month" ? cursor.format("MMM YY") : cursor.format("DD MMM"), revenue: 0, expenses: 0, profit: 0 });
    cursor = step === "month" ? cursor.add(1, "month") : cursor.add(1, "day");
    guard += 1;
  }
  return buckets;
}

async function getDashboard(rangeInput) {
  const range = parseDateRange(rangeInput);
  const prev = previousPeriod(range);
  const weekStart = DATE_PRESETS.week().start;

  const [current, previous, cashFlow, recv, accounts, lowStock, counts, today, week] = await Promise.all([
    summaryInRange(range.start, range.end),
    summaryInRange(prev.start, prev.end),
    getCashFlow(range.start, range.end),
    receivablesTotals(),
    Account.find({ active: true }).select("name type openingBalance currentBalance").sort("type"),
    Product.find({ status: "active", $expr: { $lte: ["$currentStock", "$minimumStock"] } }).select("name sku currentStock minimumStock sellingPrice"),
    Promise.all([
      Order.countDocuments({ orderStatus: "Pending" }),
      Order.countDocuments({ orderStatus: { $in: ["Returned", "Refunded"] } }),
      Return.countDocuments({ returnDate: { $gte: range.start, $lte: range.end } }),
      Sale.countDocuments({ status: "completed", saleDate: { $gte: range.start, $lte: range.end } }),
    ]),
    salesSummaryInRange(dayjs().tz(TIMEZONE).startOf("day").toDate(), endOfDay()),
    salesSummaryInRange(weekStart, endOfDay()),
  ]);

  const kpis = {
    revenue: compareValue(current.revenue, previous.revenue),
    totalSales: compareValue(current.salesCount + current.ordersCount, previous.salesCount + previous.ordersCount),
    totalOrders: compareValue(current.ordersCount, previous.ordersCount),
    productsSold: compareValue(current.soldQuantity, previous.soldQuantity),
    totalExpenses: compareValue(current.expenses, previous.expenses),
    productCost: compareValue(current.cogs, previous.cogs),
    grossProfit: compareValue(current.grossProfit, previous.grossProfit),
    netProfit: compareValue(current.netProfit, previous.netProfit),
    otherIncome: current.otherIncome,
    pendingOrders: counts[0],
    returnedOrders: counts[1],
    cashBalance: accounts.reduce((s, a) => s + a.currentBalance, 0),
    totalReceivable: recv.receivables,
    totalPayable: recv.payables,
    grossMargin: current.grossMargin,
    netMargin: current.netMargin,
  };

  const miniPeriods = {
    today: {
      salesCount: today.totalSales,
      revenue: today.revenue,
      grossProfit: today.grossProfit,
    },
    week: {
      salesCount: week.totalSales,
      revenue: week.revenue,
      grossProfit: week.grossProfit,
    },
  };

  const charts = await buildCharts(range);

  const [recentOrders, recentSales, recentExpenses] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(8).populate("customer", "name phone"),
    Sale.find().sort({ createdAt: -1 }).limit(8).populate("customer", "name phone"),
    Expense.find({ expenseDate: { $gte: range.start, $lte: range.end } }).sort({ expenseDate: -1 }).limit(6).select("title category amount expenseDate"),
  ]);

  return {
    range: { start: range.start, end: range.end, preset: range.preset },
    kpis,
    miniPeriods,
    cashFlow,
    accounts,
    lowStock,
    charts,
    recent: { orders: recentOrders, sales: recentSales, expenses: recentExpenses },
  };
}

async function buildCharts(range) {
  const [sales, orders, expenses, returns] = await Promise.all([
    Sale.find({ status: "completed", saleDate: { $gte: range.start, $lte: range.end } }).select("total profit productCost discount deliveryCharge saleDate paymentMethod items"),
    Order.find({ orderDate: { $gte: range.start, $lte: range.end } }).select("total profit productCost discount deliveryCharge orderDate paymentMethod orderStatus items"),
    Expense.find({ expenseDate: { $gte: range.start, $lte: range.end } }).select("amount category expenseDate"),
    Return.find({ returnDate: { $gte: range.start, $lte: range.end } }).select("totalRefundAmount returnDate"),
  ]);

  const buckets = fillBuckets(range);
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  for (const s of sales) {
    const b = bucketMap.get(bucketKey(s.saleDate, range));
    if (b) { b.revenue += s.total; b.profit += s.profit; }
  }
  for (const o of orders) {
    const b = bucketMap.get(bucketKey(o.orderDate, range));
    if (b) { b.revenue += o.total; b.profit += o.profit; }
  }
  for (const e of expenses) {
    const b = bucketMap.get(bucketKey(e.expenseDate, range));
    if (b) b.expenses += e.amount;
  }
  for (const r of returns) {
    const b = bucketMap.get(bucketKey(r.returnDate, range));
    if (b) { b.revenue -= r.totalRefundAmount; b.profit -= r.totalRefundAmount; }
  }

  buckets.forEach((b) => {
    b.revenue = Number(b.revenue.toFixed(2));
    b.expenses = Number(b.expenses.toFixed(2));
    b.profit = Number(b.profit.toFixed(2));
  });

  const itemDocs = [...sales, ...orders];

  const productIdSet = new Set();
  itemDocs.forEach((d) => d.items.forEach((i) => productIdSet.add(String(i.product))));
  const products = await Product.find({ _id: { $in: [...productIdSet] } }).select("name category");
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const catMap = {};
  const payMap = {};
  const topProductMap = {};
  const orderStatusMap = {};

  for (const d of itemDocs) {
    const isReturnedOrder = d.orderStatus === "Returned" || d.orderStatus === "Refunded";
    for (const i of d.items) {
      const qty = (i.quantity || 0) - (i.returnedQuantity || 0);
      if (qty <= 0) continue;
      const product = productMap.get(String(i.product));
      const category = product?.category || "Other";
      const revenue = (i.sellingPrice || 0) * qty;
      catMap[category] = (catMap[category] || 0) + revenue;
      if (!topProductMap[i.name]) topProductMap[i.name] = { name: i.name, quantity: 0, revenue: 0 };
      topProductMap[i.name].quantity += qty;
      topProductMap[i.name].revenue += revenue;
    }
    if (!isReturnedOrder) {
      payMap[d.paymentMethod] = (payMap[d.paymentMethod] || 0) + d.total;
    }
    if (d.orderStatus) {
      orderStatusMap[d.orderStatus] = (orderStatusMap[d.orderStatus] || 0) + 1;
    }
  }

  const expenseMap = {};
  for (const e of expenses) {
    expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
  }

  const salesByCategory = Object.entries(catMap).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value);
  const paymentMethods = Object.entries(payMap).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value);
  const topProducts = Object.values(topProductMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((p) => ({ ...p, revenue: Number(p.revenue.toFixed(2)) }));
  const orderStatus = Object.entries(orderStatusMap).map(([name, value]) => ({ name, value }));
  const expenseBreakdown = Object.entries(expenseMap).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value);

  return {
    salesOverview: buckets,
    salesByCategory,
    paymentMethods,
    topProducts,
    orderStatus,
    expenseBreakdown,
  };
}

module.exports = { getDashboard };