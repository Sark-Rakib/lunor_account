const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const {
  salesReport,
  expenseReport,
  profitLossReport,
  inventoryReport,
  productReport,
  customerReport,
  supplierReport,
  cashFlowReport,
} = require("../services/reportService");

const getSalesReport = asyncHandler(async (req, res) => {
  const report = await salesReport(req.query);
  sendSuccess(res, { report }, "Sales report", 200);
});

const getExpenseReport = asyncHandler(async (req, res) => {
  const report = await expenseReport(req.query);
  sendSuccess(res, { report }, "Expense report", 200);
});

const getProfitLossReport = asyncHandler(async (req, res) => {
  const report = await profitLossReport(req.query);
  sendSuccess(res, { report }, "Profit & Loss report", 200);
});

const getInventoryReport = asyncHandler(async (req, res) => {
  const report = await inventoryReport(req.query);
  sendSuccess(res, { report }, "Inventory report", 200);
});

const getProductReport = asyncHandler(async (req, res) => {
  const report = await productReport(req.query);
  sendSuccess(res, { report }, "Product report", 200);
});

const getCustomerReport = asyncHandler(async (req, res) => {
  const report = await customerReport(req.query);
  sendSuccess(res, { report }, "Customer report", 200);
});

const getSupplierReport = asyncHandler(async (req, res) => {
  const report = await supplierReport(req.query);
  sendSuccess(res, { report }, "Supplier report", 200);
});

const getCashFlowReport = asyncHandler(async (req, res) => {
  const report = await cashFlowReport(req.query);
  sendSuccess(res, { report }, "Cash flow report", 200);
});

module.exports = {
  getSalesReport,
  getExpenseReport,
  getProfitLossReport,
  getInventoryReport,
  getProductReport,
  getCustomerReport,
  getSupplierReport,
  getCashFlowReport,
};