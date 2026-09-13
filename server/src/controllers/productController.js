const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { logActivity } = require("../services/activityService");
const { recordStockMovement, checkAndNotifyLowStock } = require("../services/stockService");
const { runInTransaction } = require("../config/db");
const { PRODUCT_CATEGORIES, SIZES, PANT_SIZES, PAYMENT_METHODS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, ACCOUNT_TYPES, RETURN_REASONS, ORDER_STATUSES } = require("../constants");

const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) {
    filter.$or = [{ name: buildSearchRegex(req.query.search) }, { sku: buildSearchRegex(req.query.search) }];
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  else filter.status = { $ne: "archived" };
  if (req.query.supplier) filter.supplier = req.query.supplier;

  const sort = {};
  const allowed = { name: "name", createdAt: "createdAt", currentStock: "currentStock", sellingPrice: "sellingPrice" };
  const sortField = allowed[req.query.sort] || "createdAt";
  sort[sortField] = req.query.order === "asc" ? 1 : -1;

  const [docs, total] = await Promise.all([
    Product.find(filter).populate("supplier", "name").sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Products fetched", 200);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("supplier", "name company phone");
  if (!product) throw notFoundError("Product");
  sendSuccess(res, { product }, "Product fetched", 200);
});

const createProduct = asyncHandler(async (req, res) => {
  const exists = await Product.findOne({ sku: String(req.body.sku || "").trim().toUpperCase() });
  if (exists) throw new AppError("A product with this SKU already exists", 400);
  const product = await Product.create({ ...req.body, createdBy: req.user._id });
  await checkAndNotifyLowStock([product]);
  await logActivity({ user: req.user, action: "created", entity: "Product", entityId: product._id, description: `Created product ${product.name} (${product.sku})` });
  sendSuccess(res, { product }, "Product created", 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw notFoundError("Product");
  if (req.body.sku) {
    const other = await Product.findOne({ sku: String(req.body.sku).trim().toUpperCase(), _id: { $ne: product._id } });
    if (other) throw new AppError("A product with this SKU already exists", 400);
  }
  Object.assign(product, req.body);
  if (req.body.sku) product.sku = String(req.body.sku).trim().toUpperCase();
  await product.save();
  await checkAndNotifyLowStock([product]);
  await logActivity({ user: req.user, action: "updated", entity: "Product", entityId: product._id, description: `Updated product ${product.name}` });
  sendSuccess(res, { product }, "Product updated", 200);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw notFoundError("Product");
  if ((product.soldQuantity || 0) > 0 || (product.purchasedQuantity || 0) > 0) {
    product.status = "archived";
    await product.save();
    await logActivity({ user: req.user, action: "archived", entity: "Product", entityId: product._id, description: `Archived product ${product.name}` });
    return sendSuccess(res, { product, archived: true }, "Product archived because it has transaction history", 200);
  }
  await product.deleteOne();
  await logActivity({ user: req.user, action: "deleted", entity: "Product", entityId: product._id, description: `Deleted product ${product.name}` });
  sendSuccess(res, {}, "Product deleted", 200);
});

const adjustStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw notFoundError("Product");
  const { type, quantity, reason = "" } = req.body;
  const allowedTypes = ["manual-increase", "manual-decrease", "adjustment", "damage"];
  if (!allowedTypes.includes(type)) throw new AppError("Invalid adjustment type", 400);
  const qty = Number(quantity);
  if (!qty || Number.isNaN(qty) || qty <= 0) throw new AppError("Quantity must be a positive number", 400);

  let sign;
  if (type === "manual-decrease" || type === "damage") sign = -1;
  if (type === "adjustment") {
    const target = Number(req.body.newStock);
    if (Number.isNaN(target) || target < 0) throw new AppError("Set a valid new stock level (>=0)", 400);
    sign = target - product.currentStock;
  }

  const result = await runInTransaction(async (session) => {
    const movement = await recordStockMovement({
      product,
      type,
      quantity: qty,
      sign,
      reason: reason || `Manual ${type.replace("-", " ")}`,
      user: req.user,
      session,
    });
    return movement;
  });
  await product.save();
  await checkAndNotifyLowStock([product]);
  await logActivity({ user: req.user, action: "stock-adjusted", entity: "Product", entityId: product._id, description: `Adjusted stock for ${product.name}: now ${product.currentStock}` });
  sendSuccess(res, { product, movement: result }, "Stock adjusted", 200);
});

const lowStock = asyncHandler(async (req, res) => {
  const docs = await Product.find({ status: "active", $expr: { $lte: ["$currentStock", "$minimumStock"] }, currentStock: { $gt: 0 } })
    .populate("supplier", "name")
    .sort({ currentStock: 1 });
  sendSuccess(res, { products: docs, count: docs.length }, "Low stock products", 200);
});

const outOfStock = asyncHandler(async (req, res) => {
  const docs = await Product.find({ status: "active", currentStock: 0 })
    .populate("supplier", "name")
    .sort({ updatedAt: -1 });
  sendSuccess(res, { products: docs, count: docs.length }, "Out of stock products", 200);
});

const getStaticOptions = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    {
      categories: PRODUCT_CATEGORIES,
      sizes: SIZES,
      pantSizes: PANT_SIZES,
      paymentMethods: PAYMENT_METHODS,
      expenseCategories: EXPENSE_CATEGORIES,
      incomeCategories: INCOME_CATEGORIES,
      accountTypes: ACCOUNT_TYPES,
      returnReasons: RETURN_REASONS,
      orderStatuses: ORDER_STATUSES,
    },
    "Options",
    200
  );
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, adjustStock, lowStock, outOfStock, getStaticOptions };