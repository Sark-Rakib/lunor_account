const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Expense = require("../models/Expense");
const Return = require("../models/Return");
const Purchase = require("../models/Purchase");
const Income = require("../models/Income");
const Customer = require("../models/Customer");

function computeItemLine(item) {
  const quantity = Number(item.quantity) || 0;
  const sellingPrice = Number(item.sellingPrice) || 0;
  const purchasePrice = Number(item.purchasePrice) || 0;
  const lineTotal = quantity * sellingPrice;
  const lineCost = quantity * purchasePrice;
  return {
    ...item,
    quantity,
    sellingPrice,
    purchasePrice,
    lineTotal: Number(lineTotal.toFixed(2)),
    lineCost: Number(lineCost.toFixed(2)),
  };
}

function computeSaleTotals(items, discount = 0, deliveryCharge = 0) {
  let subtotal = 0;
  let productCost = 0;
  const enriched = items.map((item) => {
    const line = computeItemLine(item);
    subtotal += line.lineTotal;
    productCost += line.lineCost;
    return line;
  });
  subtotal = Number(subtotal.toFixed(2));
  productCost = Number(productCost.toFixed(2));
  discount = Number(discount) || 0;
  deliveryCharge = Number(deliveryCharge) || 0;
  const total = Number((subtotal - discount + deliveryCharge).toFixed(2));
  const profit = Number((total - productCost).toFixed(2));
  return { items: enriched, subtotal, discount, deliveryCharge, total, productCost, profit };
}

async function salesSummaryInRange(start, end, monthFilter = {}) {
  const sales = await Sale.find({
    status: "completed",
    saleDate: { $gte: start, $lte: end },
    ...monthFilter,
  }).select("total productCost discount deliveryCharge saleDate items paymentMethod");
  const orders = await Order.find({
    revenueRecognized: true,
    orderDate: { $gte: start, $lte: end },
  }).select("total productCost discount deliveryCharge orderDate items orderStatus");

  const returns = await Return.find({
    returnDate: { $gte: start, $lte: end },
  }).select("totalRefundAmount totalCost items");

  const saleTotal = sales.reduce((s, x) => s + x.total, 0);
  const orderTotal = orders.reduce((s, x) => s + x.total, 0);
  const rawRevenue = saleTotal + orderTotal;

  const refundTotal = returns.reduce((s, r) => s + r.totalRefundAmount, 0);
  const returnedCost = returns.reduce((s, r) => s + r.totalCost, 0);
  const soldQuantity = countSoldRecords(sales) + countSoldRecords(orders);

  const saleProductCost = sales.reduce((s, x) => s + x.productCost, 0);
  const orderProductCost = orders.reduce((s, x) => s + x.productCost, 0);

  const revenue = Number((rawRevenue - refundTotal).toFixed(2));
  const cogs = Number((saleProductCost + orderProductCost - returnedCost).toFixed(2));
  const grossProfit = Number((revenue - cogs).toFixed(2));
  const discounts = Number(
    ([...sales, ...orders].reduce((s, x) => s + (x.discount || 0), 0)).toFixed(2)
  );
  const deliveryCharges = Number(
    ([...sales, ...orders].reduce((s, x) => s + (x.deliveryCharge || 0), 0)).toFixed(2)
  );

  return {
    salesCount: sales.length,
    ordersCount: orders.length,
    totalSales: sales.length + orders.length,
    totalTransactions: sales.length + orders.length,
    revenue,
    rawRevenue,
    saleTotal,
    orderTotal,
    cogs,
    grossProfit,
    discounts,
    deliveryCharges,
    soldQuantity,
    refundTotal,
    returnedCost,
    productSales: soldQuantity,
  };
}

function countSoldRecords(records) {
  return records.reduce((sum, rec) => {
    return sum + rec.items.reduce((s, i) => s + (i.quantity || 0) - (i.returnedQuantity || 0), 0);
  }, 0);
}

function countActiveOrders(orders) {
  return orders.filter((o) => o.orderStatus !== "Returned" && o.orderStatus !== "Refunded").length;
}

async function expenseSummaryInRange(start, end) {
  const expenses = await Expense.find({
    expenseDate: { $gte: start, $lte: end },
  }).select("amount category title expenseDate paymentMethod");
  const total = expenses.reduce((s, x) => s + x.amount, 0);
  return { total: Number(total.toFixed(2)), count: expenses.length, expenses };
}

async function purchaseSummaryInRange(start, end) {
  const purchases = await Purchase.find({
    purchaseDate: { $gte: start, $lte: end },
  }).select("totalAmount paidAmount dueAmount supplier");
  const totalAmount = purchases.reduce((s, x) => s + x.totalAmount, 0);
  const paidAmount = purchases.reduce((s, x) => s + x.paidAmount, 0);
  const dueAmount = purchases.reduce((s, x) => s + x.dueAmount, 0);
  return { totalAmount, paidAmount, dueAmount, count: purchases.length };
}

async function incomeSummaryInRange(start, end) {
  const incomes = await Income.find({
    incomeDate: { $gte: start, $lte: end },
  }).select("amount category title incomeDate");
  const total = incomes.reduce((s, x) => s + x.amount, 0);
  return { total: Number(total.toFixed(2)), count: incomes.length };
}

async function summaryInRange(start, end) {
  const sales = await salesSummaryInRange(start, end);
  const expenses = await expenseSummaryInRange(start, end);
  const purchases = await purchaseSummaryInRange(start, end);
  const incomes = await incomeSummaryInRange(start, end);

  const operatingExpenses = expenses.total;
  const netProfit = Number((sales.grossProfit - operatingExpenses).toFixed(2));
  const grossMargin =
    sales.revenue > 0 ? Number(((sales.grossProfit / sales.revenue) * 100).toFixed(1)) : 0;
  const netMargin =
    sales.revenue > 0 ? Number(((netProfit / sales.revenue) * 100).toFixed(1)) : 0;

  return {
    ...sales,
    expenses: operatingExpenses,
    expenseCount: expenses.count,
    purchases,
    otherIncome: incomes.total,
    incomeCount: incomes.count,
    operatingExpenses,
    netProfit,
    grossMargin,
    netMargin,
  };
}

async function receivablesTotals() {
  const [customerDue, supplierDue] = await Promise.all([
    Customer.aggregate([{ $group: { _id: null, totalDue: { $sum: "$totalDue" } } }]),
    require("../models/Supplier").aggregate([
      { $group: { _id: null, totalDue: { $sum: "$totalDue" } } },
    ]),
  ]);
  return {
    receivables: Number((customerDue[0]?.totalDue || 0).toFixed(2)),
    payables: Number((supplierDue[0]?.totalDue || 0).toFixed(2)),
  };
}

module.exports = {
  computeItemLine,
  computeSaleTotals,
  salesSummaryInRange,
  expenseSummaryInRange,
  purchaseSummaryInRange,
  incomeSummaryInRange,
  summaryInRange,
  receivablesTotals,
};