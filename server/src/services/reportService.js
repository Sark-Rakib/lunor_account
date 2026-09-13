const { summaryInRange, expenseSummaryInRange, salesSummaryInRange } = require("./finance");
const { getCashFlow } = require("./accountingService");
const Sale = require("../models/Sale");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const Expense = require("../models/Expense");
const { parseDateRange, previousPeriod } = require("../utils/date");

async function salesReport(query) {
  const range = parseDateRange(query);
  const summary = await salesSummaryInRange(range.start, range.end);
  const sales = await Sale.find({
    status: "completed",
    saleDate: { $gte: range.start, $lte: range.end },
  })
    .populate("customer", "name phone")
    .sort({ saleDate: -1 })
    .select("invoiceNumber customer total productCost profit paymentStatus saleDate items");

  const orders = await Order.find({
    orderDate: { $gte: range.start, $lte: range.end },
  })
    .sort({ orderDate: -1 })
    .select("orderNumber customer total productCost profit paymentStatus orderStatus orderDate items");

  const productAgg = {};
  for (const d of [...sales, ...orders]) {
    for (const i of d.items) {
      const qty = (i.quantity || 0) - (i.returnedQuantity || 0);
      if (qty <= 0) continue;
      if (!productAgg[i.name]) productAgg[i.name] = { name: i.name, quantity: 0, revenue: 0, cost: 0 };
      productAgg[i.name].quantity += qty;
      productAgg[i.name].revenue += i.lineTotal;
      productAgg[i.name].cost += i.lineCost;
    }
  }

  return {
    range,
    summary: {
      totalSales: summary.totalSales,
      revenue: summary.revenue,
      productsSold: summary.soldQuantity,
      averageOrderValue: summary.totalSales ? Number((summary.rawRevenue / summary.totalSales).toFixed(2)) : 0,
      rawRevenue: summary.rawRevenue,
      refundTotal: summary.refundTotal,
    },
    sales,
    orders,
    topProducts: Object.values(productAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}

async function expenseReport(query) {
  const range = parseDateRange(query);
  const { total, count, expenses } = await expenseSummaryInRange(range.start, range.end);
  const byCategory = {};
  for (const e of expenses) {
    byCategory[e.category] = Number(((byCategory[e.category] || 0) + e.amount).toFixed(2));
  }
  return {
    range,
    summary: { total, count },
    byCategory: Object.entries(byCategory).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    expenses,
  };
}

async function profitLossReport(query) {
  const range = parseDateRange(query);
  const current = await summaryInRange(range.start, range.end);
  const prev = previousPeriod(range);

  const revenue =
    current.salesCount + current.ordersCount > 0
      ? current.rawRevenue / (current.salesCount + current.ordersCount)
      : 0;

  return {
    range,
    financials: {
      revenue: current.revenue,
      rawRevenue: current.rawRevenue,
      cogs: current.cogs,
      grossProfit: current.grossProfit,
      grossMargin: current.grossMargin,
      operatingExpenses: current.operatingExpenses,
      otherIncome: current.otherIncome,
      netProfit: current.netProfit,
      netMargin: current.netMargin,
      salesCount: current.salesCount + current.ordersCount,
      productsSold: current.soldQuantity,
      averageOrderValue: Number(revenue.toFixed(2)),
      refundTotal: current.refundTotal,
    },
    rangePrev: { ...prev },
  };
}

async function inventoryReport(query) {
  const products = await Product.find({ status: "active" })
    .select("name sku category purchasePrice sellingPrice currentStock minimumStock supplier")
    .populate("supplier", "name")
    .sort({ name: 1 });

  const byCategory = {};
  let stockValue = 0;
  let retailValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    const value = p.currentStock * p.purchasePrice;
    stockValue += value;
    retailValue += p.currentStock * p.sellingPrice;
    if (p.currentStock === 0) outOfStockCount += 1;
    else if (p.currentStock <= p.minimumStock) lowStockCount += 1;
    byCategory[p.category] = Number(((byCategory[p.category] || 0) + value).toFixed(2));
  }

  return {
    summary: {
      totalProducts: products.length,
      stockValue: Number(stockValue.toFixed(2)),
      retailValue: Number(retailValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
    },
    byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    products,
  };
}

async function productReport(query) {
  const range = parseDateRange(query);
  const [sales, orders] = await Promise.all([
    Sale.find({ status: "completed", saleDate: { $gte: range.start, $lte: range.end } }).select("items"),
    Order.find({ orderDate: { $gte: range.start, $lte: range.end } }).select("items"),
  ]);

  const agg = {};
  for (const d of [...sales, ...orders]) {
    for (const i of d.items) {
      const qty = (i.quantity || 0) - (i.returnedQuantity || 0);
      if (qty <= 0) continue;
      if (!agg[i.name]) agg[i.name] = { name: i.name, quantity: 0, revenue: 0, cost: 0, profit: 0 };
      agg[i.name].quantity += qty;
      agg[i.name].revenue += i.lineTotal;
      agg[i.name].cost += i.lineCost;
      agg[i.name].profit += i.lineTotal - i.lineCost;
    }
  }

  const products = Object.values(agg).map((p) => ({
    ...p,
    revenue: Number(p.revenue.toFixed(2)),
    cost: Number(p.cost.toFixed(2)),
    profit: Number(p.profit.toFixed(2)),
  }));

  return {
    range,
    summary: {
      revenue: products.reduce((s, p) => s + p.revenue, 0),
      sold: products.reduce((s, p) => s + p.quantity, 0),
      profit: Number(products.reduce((s, p) => s + p.profit, 0).toFixed(2)),
    },
    bestSellers: [...products].sort((a, b) => b.quantity - a.quantity),
    worstSellers: [...products].sort((a, b) => a.quantity - b.quantity),
    byProfit: [...products].sort((a, b) => b.profit - a.profit),
  };
}

async function customerReport(query) {
  const range = parseDateRange(query);
  const customers = await Customer.find().sort({ totalPurchased: -1 }).select("name phone totalOrders totalPurchased totalPaid totalDue lastOrder returnCount");
  return {
    range,
    summary: {
      totalCustomers: customers.length,
      totalSpend: customers.reduce((s, c) => s + c.totalPurchased, 0),
      totalDue: customers.reduce((s, c) => s + c.totalDue, 0),
    },
    topCustomers: customers.slice(0, 10),
    totalCustomers: customers.length,
  };
}

async function supplierReport(query) {
  const range = parseDateRange(query);
  const suppliers = await Supplier.find().sort({ totalPurchase: -1 }).select("name company phone totalPurchase totalPaid totalDue");
  return {
    range,
    summary: {
      totalSuppliers: suppliers.length,
      totalPurchase: suppliers.reduce((s, x) => s + x.totalPurchase, 0),
      totalPaid: suppliers.reduce((s, x) => s + x.totalPaid, 0),
      totalDue: suppliers.reduce((s, x) => s + x.totalDue, 0),
    },
    suppliers,
  };
}

async function cashFlowReport(query) {
  const range = parseDateRange(query);
  const flow = await getCashFlow(range.start, range.end);
  return { range, flow };
}

module.exports = {
  salesReport,
  expenseReport,
  profitLossReport,
  inventoryReport,
  productReport,
  customerReport,
  supplierReport,
  cashFlowReport,
};