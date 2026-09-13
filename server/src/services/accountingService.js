const Payment = require("../models/Payment");
const Account = require("../models/Account");
const AppError = require("../utils/AppError");

async function resolveAccount(method, accountId = null) {
  if (accountId) {
    const acc = await Account.findById(accountId);
    if (acc) return acc;
  }
  if (method) {
    let acc = await Account.findOne({ type: method, active: true });
    if (acc) return acc;
  }
  let acc = await Account.findOne({ isDefault: true, active: true });
  if (!acc) acc = await Account.findOne({ active: true });
  if (!acc) {
    acc = await Account.create({
      name: "Cash",
      type: "Cash",
      openingBalance: 0,
      currentBalance: 0,
      isDefault: true,
      active: true,
    });
  }
  return acc;
}

async function createPayment({
  type,
  direction,
  amount,
  method = "Cash",
  account = null,
  referenceType = "",
  reference = null,
  customer = null,
  supplier = null,
  description = "",
  paymentDate = new Date(),
  user = null,
  session = null,
}) {
  amount = Number(amount) || 0;
  if (amount < 0) throw new AppError("Payment amount must not be negative", 400);
  if (amount === 0) return null;

  let acc = await resolveAccount(method, account);
  if (!acc) throw new AppError("No account configured to record this payment", 400);

  const payment = new Payment({
    type,
    direction,
    amount,
    method,
    account: acc._id,
    referenceType,
    reference,
    customer,
    supplier,
    description,
    paymentDate,
    createdBy: user?._id || user || null,
  });
  if (session) await payment.save({ session });
  else await payment.save();

  acc.currentBalance = Number(
    (acc.currentBalance + (direction === "in" ? amount : -amount)).toFixed(2)
  );
  if (session) await acc.save({ session });
  else await acc.save();

  return payment;
}

async function recomputeAccountBalances(session = null) {
  const accounts = await Account.find({ active: true });
  for (const acc of accounts) {
    const agg = await Payment.aggregate([
      { $match: { account: acc._id } },
      {
        $group: {
          _id: "$account",
          totalIn: {
            $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$amount", 0] },
          },
          totalOut: {
            $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$amount", 0] },
          },
        },
      },
    ]);
    const row = agg[0] || { totalIn: 0, totalOut: 0 };
    acc.currentBalance = Number(
      (acc.openingBalance + (row.totalIn || 0) - (row.totalOut || 0)).toFixed(2)
    );
    if (session) await acc.save({ session });
    else await acc.save();
  }
  const total = await Account.aggregate([{ $group: { _id: null, total: { $sum: "$currentBalance" } } }]);
  return { total: Number((total[0]?.total || 0).toFixed(2)) };
}

async function getCashFlow(start, end) {
  const payments = await Payment.find({
    paymentDate: { $gte: start, $lte: end },
  }).populate("account", "name type");

  let cashIn = 0;
  let cashOut = 0;
  let customerPayments = 0;
  let supplierPayments = 0;
  let refundsOut = 0;
  let cashInPayments = 0;
  let cashOutPayments = 0;

  for (const p of payments) {
    if (p.direction === "in") {
      cashIn += p.amount;
      if (p.type === "income" || p.type === "other") cashInPayments += p.amount;
      if (p.type === "customer-payment" || p.type === "sale") customerPayments += p.amount;
    } else {
      cashOut += p.amount;
      if (p.type === "expense" || p.type === "purchase") cashOutPayments += p.amount;
      if (p.type === "supplier-payment") supplierPayments += p.amount;
      if (p.type === "refund") refundsOut += p.amount;
    }
  }

  const openingAccount = await Account.findOne({ isDefault: true }).select("openingBalance");
  const totalOpening = openingAccount?.openingBalance || 0;

  return {
    cashIn: Number(cashIn.toFixed(2)),
    cashOut: Number(cashOut.toFixed(2)),
    customerPayments: Number(customerPayments.toFixed(2)),
    supplierPayments: Number(supplierPayments.toFixed(2)),
    refundsOut: Number(refundsOut.toFixed(2)),
    otherIn: Number(cashInPayments.toFixed(2)),
    otherOut: Number(cashOutPayments.toFixed(2)),
    netCashFlow: Number((cashIn - cashOut).toFixed(2)),
    openingBalance: Number(totalOpening.toFixed(2)),
    closingBalance: Number((totalOpening + cashIn - cashOut).toFixed(2)),
  };
}

module.exports = { createPayment, recomputeAccountBalances, getCashFlow, resolveAccount };