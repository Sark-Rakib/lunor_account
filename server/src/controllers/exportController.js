const PDFDocument = require("pdfkit");
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
const BusinessSettings = require("../models/BusinessSettings");
const asyncHandler = require("../utils/asyncHandler");

function toCsv(rows) {
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function buildRowsReport(data) {
  return [
    ["Business", "LUNOR"],
    ["Tagline", "Business Manager"],
    ["Report Title", data.title],
    ["Date Range", data.rangeLabel],
    ["Generated At", data.generatedAt],
    [],
  ];
}

async function getReportData(type, query) {
  switch (type) {
    case "sales": {
      const r = await salesReport(query);
      const rows = r.sales.map((s) => ({ Invoice: s.invoiceNumber, Customer: s.customer?.name || "-", Subtotal: s.subtotal, Discount: s.discount, Delivery: s.deliveryCharge, Total: s.total, Cost: s.productCost, Profit: s.profit, Payment: s.paymentMethod, Date: new Date(s.saleDate).toLocaleDateString("en-GB") }));
      return { title: "Sales Report", range: r.range, rows, summary: r.summary, extraRows: r.orders.map((o) => ({ Invoice: o.orderNumber, Customer: o.customer?.name || "-", Subtotal: o.subtotal, Discount: o.discount, Delivery: o.deliveryCharge, Total: o.total, Cost: o.productCost, Profit: o.profit, Payment: o.paymentMethod, Date: new Date(o.orderDate).toLocaleDateString("en-GB"), Status: o.orderStatus })) };
    }
    case "expenses": {
      const r = await expenseReport(query);
      const rows = r.expenses.map((e) => ({ Title: e.title, Category: e.category, Amount: e.amount, Method: e.paymentMethod, Date: new Date(e.expenseDate).toLocaleDateString("en-GB") }));
      return { title: "Expense Report", range: r.range, rows, summary: r.summary };
    }
    case "profit-loss": {
      const r = await profitLossReport(query);
      const f = r.financials;
      const rows = [
        { Item: "Revenue (Net of returns)", Amount: f.revenue },
        { Item: "Cost of Goods Sold (COGS)", Amount: f.cogs },
        { Item: "Gross Profit", Amount: f.grossProfit },
        { Item: "Gross Margin %", Amount: f.grossMargin + "%" },
        { Item: "Operating Expenses", Amount: f.operatingExpenses },
        { Item: "Other Income", Amount: f.otherIncome },
        { Item: "Net Profit", Amount: f.netProfit },
        { Item: "Net Profit Margin %", Amount: f.netMargin + "%" },
      ];
      return { title: "Profit & Loss Report", range: r.range, rows, summary: f };
    }
    case "inventory": {
      const r = await inventoryReport(query);
      const rows = r.products.map((p) => ({ SKU: p.sku, Name: p.name, Category: p.category, Stock: p.currentStock, MinStock: p.minimumStock, CostPrice: p.purchasePrice, SellPrice: p.sellingPrice, Value: p.currentStock * p.purchasePrice, Supplier: p.supplier?.name || "-" }));
      return { title: "Inventory Report", range: r.range, rows, summary: r.summary };
    }
    case "products": {
      const r = await productReport(query);
      const rows = r.bestSellers.map((p) => ({ Name: p.name, QuantitySold: p.quantity, Revenue: p.revenue, Cost: p.cost, Profit: p.profit }));
      return { title: "Product Report", range: r.range, rows, summary: r.summary, extraRows: r.newArrivals || [] };
    }
    case "customers": {
      const r = await customerReport(query);
      const rows = r.topCustomers.map((c) => ({ Name: c.name, Phone: c.phone, Orders: c.totalOrders, TotalSpent: c.totalPurchased, TotalPaid: c.totalPaid, TotalDue: c.totalDue, LastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("en-GB") : "-" }));
      return { title: "Customer Report", range: r.range, rows, summary: r.summary };
    }
    case "suppliers": {
      const r = await supplierReport(query);
      const rows = r.suppliers.map((s) => ({ Name: s.name, Company: s.company, Phone: s.phone, TotalPurchase: s.totalPurchase, TotalPaid: s.totalPaid, TotalDue: s.totalDue }));
      return { title: "Supplier Report", range: r.range, rows, summary: r.summary };
    }
    case "cashflow": {
      const r = await cashFlowReport(query);
      const f = r.flow;
      const rows = [
        { Item: "Opening Balance", Amount: f.openingBalance },
        { Item: "Total Cash In", Amount: f.cashIn },
        { Item: "Customer Payments / Sales In", Amount: f.customerPayments },
        { Item: "Other Income In", Amount: f.otherIn },
        { Item: "Total Cash Out", Amount: f.cashOut },
        { Item: "Supplier Payments", Amount: f.supplierPayments },
        { Item: "Refunds Out", Amount: f.refundsOut },
        { Item: "Other Expenses Out", Amount: f.otherOut },
        { Item: "Net Cash Flow", Amount: f.netCashFlow },
        { Item: "Closing Balance", Amount: f.closingBalance },
      ];
      return { title: "Cash Flow Report", range: r.range, rows, summary: f };
    }
    default:
      throw new Error("Unsupported report type");
  }
}

function rangeLabel(range) {
  if (!range) return "";
  return `${new Date(range.start).toLocaleDateString("en-GB")} - ${new Date(range.end).toLocaleDateString("en-GB")}`;
}

const exportCsv = asyncHandler(async (req, res) => {
  const report = await getReportData(req.params.type, req.query);
  const settings = await BusinessSettings.getSettings();
  const header = [
    `Business,${settings.businessName}`,
    `Tagline,${settings.tagline}`,
    `Report Title,${report.title}`,
    `Date Range,${rangeLabel(report.range)}`,
    `Generated At,${new Date().toLocaleString("en-GB")}`,
    "",
  ].join("\n");

  const summaryRows = Object.entries(report.summary || {}).map(([k, v]) => [String(k).replace(/_/g, " "), v]);
  const summaryCsv = toCsv(summaryRows);

  let csv = header + "\n" + summaryCsv + "\n\n";
  const mainRows = [...(report.extraRows || []), ...report.rows];
  if (mainRows.length) csv += toCsv(mainRows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report-${Date.now()}.csv"`);
  res.send(csv);
});

const exportXlsx = asyncHandler(async (req, res) => {
  const report = await getReportData(req.params.type, req.query);
  const settings = await BusinessSettings.getSettings();
  const xlsx = require("xlsx");
  const wb = xlsx.utils.book_new();
  const headerRows = [
    ["Business", settings.businessName],
    ["Tagline", settings.tagline],
    ["Report Title", report.title],
    ["Date Range", rangeLabel(report.range)],
    ["Generated At", new Date().toLocaleString("en-GB")],
  ];
  const summarySheet = xlsx.utils.aoa_to_sheet([...headerRows, [], ["Summary", "Value"], ...Object.entries(report.summary || {})]);
  xlsx.utils.book_append_sheet(wb, summarySheet, "Summary");

  const mainRows = [...(report.extraRows || []), ...report.rows];
  if (mainRows.length) {
    const dataSheet = xlsx.utils.json_to_sheet(mainRows);
    xlsx.utils.book_append_sheet(wb, dataSheet, "Data");
  }

  const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report-${Date.now()}.xlsx"`);
  res.send(buf);
});

const exportPdf = asyncHandler(async (req, res) => {
  const report = await getReportData(req.params.type, req.query);
  const settings = await BusinessSettings.getSettings();

  const doc = new PDFDocument({ margin: 45, size: "A4" });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report-${Date.now()}.pdf"`);
    res.send(pdfData);
  });

  doc.font("Helvetica-Bold").fontSize(20).text(settings.businessName, { align: "center" });
  doc.font("Helvetica").fontSize(11).text(settings.tagline, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(15).text(report.title, { align: "center" });
  doc.fontSize(9).text(`Date Range: ${rangeLabel(report.range)}`, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, { align: "center" });
  doc.moveDown();
  doc.moveTo(45, doc.y).lineTo(550, doc.y).stroke();

  doc.moveDown(0.5);
  Object.entries(report.summary || {}).forEach(([key, value]) => {
    doc.font("Helvetica").fontSize(10).text(`${String(key).replace(/_/g, " ").toUpperCase()}: ${value}`, { continued: false });
    doc.moveDown(0.1);
  });

  doc.moveDown();
  const mainRows = [...(report.extraRows || []), ...report.rows];
  if (mainRows.length) {
    doc.font("Helvetica-Bold").fontSize(10).text("Details", { underline: true });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(8);
    mainRows.forEach((row) => {
      const line = Object.values(row).join(" | ");
      doc.text(line);
    });
  }

  doc.end();
});

module.exports = { exportCsv, exportXlsx, exportPdf };