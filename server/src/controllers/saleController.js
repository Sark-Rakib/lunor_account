const Sale = require("../models/Sale");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, notFoundError } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { createSale, cancelSale } = require("../services/saleService");
const { logActivity } = require("../services/activityService");

const listSales = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) filter.invoiceNumber = buildSearchRegex(req.query.search);
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.from) filter.saleDate = { $gte: new Date(req.query.from) };
  if (req.query.to) filter.saleDate = { ...(filter.saleDate || {}), $lte: new Date(new Date(req.query.to).getTime() + 86399999) };

  const [docs, total] = await Promise.all([
    Sale.find(filter).populate("customer", "name phone").sort({ saleDate: -1 }).skip(skip).limit(limit),
    Sale.countDocuments(filter),
  ]);

  const sums = await Sale.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$total" }, cost: { $sum: "$productCost" }, profit: { $sum: "$profit" }, due: { $sum: "$dueAmount" } } },
  ]);

  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Sales fetched", 200, {
    summary: sums[0]
      ? { total: sums[0].total, cost: sums[0].cost, profit: sums[0].profit, due: sums[0].due }
      : { total: 0, cost: 0, profit: 0, due: 0 },
  });
});

const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate("customer", "name phone email address").populate("createdBy", "name");
  if (!sale) throw notFoundError("Sale");
  sendSuccess(res, { sale }, "Sale fetched", 200);
});

const recordPayment = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate("customer", "name");
  if (!sale) throw notFoundError("Sale");
  if (sale.status === "cancelled") throw new AppError("Cannot record payment on a cancelled sale", 400);
  if (sale.dueAmount <= 0) throw new AppError("This sale is already fully paid", 400);

  const { createPayment, resolveAccount } = require("../services/accountingService");
  const { runInTransaction } = require("../config/db");
  const Customer = require("../models/Customer");
  const { logActivity } = require("../services/activityService");

  let paidNow = Number(req.body.amount) || 0;
  if (paidNow <= 0) throw new AppError("Payment amount must be greater than zero", 400);
  const remaining = Number(sale.dueAmount.toFixed(2));
  if (paidNow > remaining) throw new AppError(`Payment exceeds the due amount of ৳${remaining}`, 400);
  paidNow = Number(paidNow.toFixed(2));

  const method = req.body.method || sale.paymentMethod || "Cash";
  const paid = Number((Number(sale.paidAmount || 0) + paidNow).toFixed(2));
  const due = Number((Number(sale.total || 0) - paid).toFixed(2));
  const paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();

  const updated = await runInTransaction(async (session) => {
    const acc = await resolveAccount(method);
    await createPayment({
      type: "sale",
      direction: "in",
      amount: paidNow,
      method,
      account: acc._id,
      referenceType: "Sale",
      reference: sale._id,
      customer: sale.customer?._id || null,
      description: req.body.notes || `Payment received for sale ${sale.invoiceNumber}`,
      paymentDate,
      user: req.user,
      session,
    });

    if (sale.customer?._id) {
      const customerSession = await Customer.findById(sale.customer._id, null, { session });
      if (customerSession) {
        customerSession.totalPaid = Number((customerSession.totalPaid || 0) + paidNow).toFixed(2);
        customerSession.totalDue = Math.max(0, Number((customerSession.totalDue || 0) - paidNow).toFixed(2));
        await customerSession.save({ session });
      }
    }

    Object.assign(sale, {
      paidAmount: paid,
      dueAmount: due,
      paymentStatus: due <= 0 ? "paid" : "partial",
    });
    await sale.save({ session });
    return sale;
  });

  await logActivity({ user: req.user, action: "payment", entity: "Sale", entityId: sale._id, description: `Recorded payment of ৳${paidNow} for sale ${sale.invoiceNumber}` });
  sendSuccess(res, { sale: updated }, "Payment recorded", 200);
});

const createSaleHandler = asyncHandler(async (req, res) => {
  const sale = await createSale({ body: req.body, user: req.user });
  sendSuccess(res, { sale }, "Sale created successfully", 201);
});

const editSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw notFoundError("Sale");
  if (sale.status === "cancelled") throw new AppError("Cannot edit a cancelled sale", 400);
  if (sale.returnedQuantity > 0) throw new AppError("Cannot edit a sale that has returns", 400);

  const { createSale } = require("../services/saleService");
  const Product = require("../models/Product");
  const Customer = require("../models/Customer");
  const { createPayment, resolveAccount } = require("../services/accountingService");
  const { recordStockMovement } = require("../services/stockService");
  const { computeSaleTotals } = require("../services/finance");
  const { runInTransaction } = require("../config/db");

  const { customer, items = [], discount = 0, deliveryCharge = 0, paymentMethod, paidAmount, saleDate, notes } = req.body;
  if (!items || items.length === 0) throw new AppError("Sale must contain at least one product", 400);

  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const updated = await runInTransaction(async (session) => {
    for (const line of sale.items) {
      const product = await Product.findById(line.product).session(session);
      if (!product) continue;
      await recordStockMovement({
        product,
        type: sale.status === "cancelled" ? "manual-increase" : "return",
        quantity: line.quantity,
        sign: 1,
        reason: `Sale edit revision ${sale.invoiceNumber}`,
        referenceType: "Sale",
        reference: sale._id,
        user: req.user,
        session,
      });
      product.soldQuantity = Math.max(0, (product.soldQuantity || 0) - line.quantity);
      product.soldRevenue = Math.max(0, (product.soldRevenue || 0) - line.lineTotal);
      await product.save({ session });
    }

    const enrichedItems = [];
    for (const item of items) {
      const product = productMap.get(String(item.product));
      if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
      if (product.currentStock < Number(item.quantity)) {
        throw new AppError(`Insufficient stock for ${product.name}: only ${product.currentStock} left`, 400);
      }
      enrichedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        size: item.size || "",
        quantity: Number(item.quantity),
        purchasePrice: item.purchasePrice !== undefined && item.purchasePrice !== "" ? Number(item.purchasePrice) : product.purchasePrice,
        sellingPrice: item.sellingPrice !== undefined && item.sellingPrice !== "" ? Number(item.sellingPrice) : product.sellingPrice,
      });
    }

    const totals = computeSaleTotals(enrichedItems, discount, deliveryCharge);
    const paid = Math.min(Number(paidAmount) ?? 0, totals.total);
    const due = Number((totals.total - paid).toFixed(2));
    const deltaPaid = paid - (sale.paidAmount || 0);

    for (const line of totals.items) {
      const product = productMap.get(String(line.product));
      await recordStockMovement({
        product,
        type: "sale",
        quantity: line.quantity,
        sign: -1,
        reason: `Sale edit revised ${sale.invoiceNumber}`,
        referenceType: "Sale",
        reference: sale._id,
        user: req.user,
        session,
      });
      product.soldQuantity = (product.soldQuantity || 0) + line.quantity;
      product.soldRevenue = (product.soldRevenue || 0) + line.lineTotal;
      await product.save({ session });
    }

    if (sale.customer) {
      await Customer.updateOne(
        { _id: sale.customer },
        {
          $inc: {
            totalPurchased: totals.total - sale.total,
            totalPaid: paid - sale.paidAmount,
            totalDue: due - sale.dueAmount,
          },
        },
        { session }
      );
    }

    if (deltaPaid !== 0) {
      const acc = await resolveAccount(sale.paymentMethod);
      if (deltaPaid > 0) {
        await createPayment({ type: "sale", direction: "in", amount: deltaPaid, method: sale.paymentMethod, account: acc._id, referenceType: "Sale", reference: sale._id, customer: sale.customer || null, description: `Additional payment for sale ${sale.invoiceNumber}`, user: req.user, session });
      } else {
        await createPayment({ type: "refund", direction: "out", amount: -deltaPaid, method: sale.paymentMethod, account: acc._id, referenceType: "Sale", reference: sale._id, customer: sale.customer || null, description: `Payment reduction for sale ${sale.invoiceNumber}`, user: req.user, session });
      }
    }

    Object.assign(sale, {
      customer: customer || sale.customer,
      items: totals.items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryCharge: totals.deliveryCharge,
      total: totals.total,
      productCost: totals.productCost,
      profit: totals.profit,
      paymentMethod: paymentMethod || sale.paymentMethod,
      paymentStatus: due <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
      paidAmount: paid,
      dueAmount: due,
      saleDate: saleDate ? new Date(saleDate) : sale.saleDate,
      notes: notes !== undefined ? notes : sale.notes,
    });
    await sale.save({ session });
    return sale;
  });

  await logActivity({ user: req.user, action: "updated", entity: "Sale", entityId: sale._id, description: `Updated sale ${sale.invoiceNumber}` });
  sendSuccess(res, { sale: updated }, "Sale updated", 200);
});

const cancelSaleHandler = asyncHandler(async (req, res) => {
  const sale = await cancelSale(req.params.id, { user: req.user });
  sendSuccess(res, { sale }, "Sale cancelled and inventory restored", 200);
});

module.exports = { listSales, getSale, createSaleHandler, editSale, cancelSaleHandler, recordPayment };