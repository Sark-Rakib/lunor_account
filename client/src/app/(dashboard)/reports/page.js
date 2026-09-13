"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { useQuery, downloadFromServer } from "@/hooks/queries";
import api from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import PeriodSelector from "@/components/PeriodSelector";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import { cn, formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "profit-loss", label: "Profit & Loss" },
  { key: "expenses", label: "Expenses" },
  { key: "inventory", label: "Inventory" },
  { key: "products", label: "Products" },
  { key: "customers", label: "Customers" },
  { key: "suppliers", label: "Suppliers" },
  { key: "cashflow", label: "Cash Flow" },
];

const EXPORT_KEY = {
  sales: "sales",
  "profit-loss": "profit-loss",
  expenses: "expenses",
  inventory: "inventory",
  products: "products",
  customers: "customers",
  suppliers: "suppliers",
  cashflow: "cashflow",
};

export default function ReportsPage() {
  const [tab, setTab] = useState("sales");
  const [range, setRange] = useState({ preset: "month", custom: null });

  const params = range.custom ? { dateFrom: range.custom.from, dateTo: range.custom.to } : { period: range.preset || "month" };

  const { data, isLoading } = useQuery({
    queryKey: ["report", tab, range],
    queryFn: () => api.get(`/reports/${tab}`, { params }),
  });

  const report = data && data.report !== undefined ? data.report : data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Deep dives into your business performance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector value={range.preset} custom={range.custom} onChange={setRange} />
            <ExportButtons reportKey={EXPORT_KEY[tab]} params={params} />
          </div>
        }
      />

      <div className="flex flex-wrap gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TabContent tab={tab} report={report} isLoading={isLoading} />
    </div>
  );
}

function TabContent({ tab, report, isLoading }) {
  switch (tab) {
    case "sales":
      return <SalesReport report={report} isLoading={isLoading} />;
    case "profit-loss":
      return <ProfitLossReport report={report} isLoading={isLoading} />;
    case "expenses":
      return <ExpenseReport report={report} isLoading={isLoading} />;
    case "inventory":
      return <InventoryReport report={report} isLoading={isLoading} />;
    case "products":
      return <ProductReport report={report} isLoading={isLoading} />;
    case "customers":
      return <CustomerReport report={report} isLoading={isLoading} />;
    case "suppliers":
      return <SupplierReport report={report} isLoading={isLoading} />;
    case "cashflow":
      return <CashFlowReport report={report} isLoading={isLoading} />;
    default:
      return null;
  }
}

function KpiStrip({ kpis, loading }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((k) => (
        <StatCard key={k.title} title={k.title} value={k.value} loading={loading} className="!p-4" />
      ))}
    </div>
  );
}

function SalesReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  const sales = report.sales || [];
  const orders = report.orders || [];
  return (
    <div className="space-y-4">
      <KpiStrip
        loading={isLoading}
        kpis={[
          { title: `Sales & Orders`, value: report.summary?.totalSales },
          { title: "Revenue", value: report.summary?.revenue },
          { title: "Avg order value", value: report.summary?.averageOrderValue },
          { title: "Refunds", value: report.summary?.refundTotal },
        ]}
      />
      <ReportTable
        title={`Invoices (${sales.length})`}
        columns={[
          { key: "invoiceNumber", header: "Invoice", render: (s) => <span className="font-medium text-indigo-600">{s.invoiceNumber}</span> },
          { key: "customer", header: "Customer", render: (s) => s.customer?.name || "Walk-in" },
          { key: "total", header: "Total", align: "right", render: (s) => formatMoney(s.total) },
          { key: "profit", header: "Profit", align: "right", render: (s) => <span className="text-emerald-600">{formatMoney(s.profit)}</span> },
          { key: "paymentStatus", header: "Payment", render: (s) => <StatusBadge status={s.paymentStatus} /> },
        ]}
        data={sales}
        keyField="invoiceNumber"
      />
      <ReportTable
        title={`Orders (${orders.length})`}
        columns={[
          { key: "orderNumber", header: "Order", render: (o) => <span className="font-medium text-indigo-600">{o.orderNumber}</span> },
          { key: "customer", header: "Customer", render: (o) => o.customer?.name || "Walk-in" },
          { key: "total", header: "Total", align: "right", render: (o) => formatMoney(o.total) },
          { key: "orderStatus", header: "Status", render: (o) => <StatusBadge status={o.orderStatus} /> },
          { key: "paymentStatus", header: "Payment", render: (o) => <StatusBadge status={o.paymentStatus} /> },
        ]}
        data={orders}
        keyField="orderNumber"
      />
      <ReportTable
        title="Top products"
        columns={[
          { key: "name", header: "Product" },
          { key: "quantity", header: "Qty", align: "right" },
          { key: "revenue", header: "Revenue", align: "right", render: (p) => formatMoney(p.revenue) },
          { key: "cost", header: "Cost", align: "right", render: (p) => formatMoney(p.cost) },
        ]}
        data={report.topProducts || []}
        keyField="name"
      />
    </div>
  );
}

function ProfitLossReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  const f = report.financials || {};
  const rows = [
    { label: "Revenue (net of returns)", value: f.revenue, kind: "pos" },
    { label: "Cost of Goods Sold (COGS)", value: f.cogs, kind: "neg" },
    { label: "Gross Profit", value: f.grossProfit, kind: "strong" },
    { label: "Gross Margin", value: `${f.grossMargin ?? 0}%`, kind: "plain" },
    { label: "Operating Expenses", value: f.operatingExpenses, kind: "neg" },
    { label: "Other Income", value: f.otherIncome, kind: "pos" },
    { label: "Net Profit", value: f.netProfit, kind: f.netProfit >= 0 ? "strong" : "negStrong" },
    { label: "Net Profit Margin", value: `${f.netMargin ?? 0}%`, kind: "plain" },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <div key={r.label} className={cn("flex items-center justify-between px-4 py-3 text-sm")}>
                <span className="text-zinc-600 dark:text-zinc-300">{r.label}</span>
                <span className={cn(
                  "font-semibold",
                  r.kind === "pos" ? "text-emerald-600" : r.kind === "neg" ? "text-rose-500" : r.kind === "negStrong" ? "text-rose-600" : r.kind === "strong" ? "text-base text-zinc-900 dark:text-zinc-50" : "text-zinc-500"
                )}>
                  {typeof r.value === "number" ? formatMoney(r.value) : r.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <KpiStrip
        kpis={[
          { title: "Sales & orders", value: f.salesCount },
          { title: "Products sold", value: f.productsSold },
          { title: "Avg order value", value: f.averageOrderValue },
          { title: "Refund total", value: f.refundTotal },
        ]}
      />
    </div>
  );
}

function ExpenseReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  return (
    <div className="space-y-4">
      <KpiStrip
        kpis={[
          { title: "Total expenses", value: report.summary?.total },
          { title: "Transactions", value: report.summary?.count },
          { title: "Top category", value: report.byCategory?.[0]?.name || "—" },
        ]}
      />
      <ReportTable
        title="By category"
        small
        columns={[
          { key: "name", header: "Category" },
          { key: "amount", header: "Amount", align: "right", render: (c) => formatMoney(c.amount) },
        ]}
        data={report.byCategory || []}
        keyField="name"
      />
      <ReportTable
        title={`Expenses (${(report.expenses || []).length})`}
        columns={[
          { key: "title", header: "Title" },
          { key: "category", header: "Category" },
          { key: "amount", header: "Amount", align: "right", render: (e) => <span className="text-rose-500">−{formatMoney(e.amount)}</span> },
          { key: "paymentMethod", header: "Method" },
        ]}
        data={report.expenses || []}
        keyField="_id"
      />
    </div>
  );
}

function InventoryReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  return (
    <div className="space-y-4">
      <KpiStrip
        kpis={[
          { title: "Products", value: report.summary?.totalProducts },
          { title: "Stock value", value: report.summary?.stockValue },
          { title: "Retail value", value: report.summary?.retailValue },
          { title: "Low / out", value: `${report.summary?.lowStockCount || 0} / ${report.summary?.outOfStockCount || 0}` },
        ]}
      />
      <ReportTable
        title="Inventory valuation by category"
        columns={[
          { key: "name", header: "Category" },
          { key: "value", header: "Value", align: "right", render: (c) => formatMoney(c.value) },
        ]}
        data={report.byCategory || []}
        keyField="name"
      />
      <ReportTable
        title={`Products (${(report.products || []).length})`}
        columns={[
          { key: "name", header: "Product", render: (p) => <>{p.name}<span className="ml-1 text-xs text-zinc-400">{p.sku}</span></> },
          { key: "currentStock", header: "Stock", align: "right" },
          { key: "purchasePrice", header: "Cost", align: "right", render: (p) => formatMoney(p.purchasePrice) },
          { key: "sellingPrice", header: "Price", align: "right", render: (p) => formatMoney(p.sellingPrice) },
          { key: "stockValue", header: "Value", align: "right", render: (p) => <span className="font-semibold">{formatMoney(p.currentStock * p.purchasePrice)}</span> },
        ]}
        data={report.products || []}
        keyField="_id"
      />
    </div>
  );
}

function ProductReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  const cols = [
    { key: "name", header: "Product" },
    { key: "quantity", header: "Qty", align: "right" },
    { key: "revenue", header: "Revenue", align: "right", render: (p) => formatMoney(p.revenue) },
    { key: "cost", header: "Cost", align: "right", render: (p) => formatMoney(p.cost) },
    { key: "profit", header: "Profit", align: "right", render: (p) => <span className="text-emerald-600">{formatMoney(p.profit)}</span> },
  ];
  return (
    <div className="space-y-4">
      <KpiStrip
        kpis={[
          { title: "Revenue", value: report.summary?.revenue },
          { title: "Units sold", value: report.summary?.sold },
          { title: "Profit", value: report.summary?.profit },
        ]}
      />
      <ReportTable title="Best sellers" columns={cols} data={report.bestSellers || []} keyField="name" />
      <ReportTable title="Biggest profit" columns={cols} data={report.byProfit || []} keyField="name" />
    </div>
  );
}

function CustomerReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  return (
    <div className="space-y-4">
      <KpiStrip
        kpis={[
          { title: "Customers", value: report.summary?.totalCustomers },
          { title: "Total spend", value: report.summary?.totalSpend },
          { title: "Total due", value: report.summary?.totalDue },
        ]}
      />
      <ReportTable
        title="Top customers"
        columns={[
          { key: "name", header: "Customer" },
          { key: "phone", header: "Phone" },
          { key: "totalOrders", header: "Orders", align: "right" },
          { key: "totalPurchased", header: "Purchased", align: "right", render: (c) => formatMoney(c.totalPurchased) },
          { key: "totalDue", header: "Due", align: "right", render: (c) => <span className="text-rose-500">{formatMoney(c.totalDue)}</span> },
        ]}
        data={report.topCustomers || []}
        keyField="_id"
      />
    </div>
  );
}

function SupplierReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  return (
    <div className="space-y-4">
      <KpiStrip
        kpis={[
          { title: "Suppliers", value: report.summary?.totalSuppliers },
          { title: "Purchases", value: report.summary?.totalPurchase },
          { title: "Paid", value: report.summary?.totalPaid },
          { title: "Due", value: report.summary?.totalDue },
        ]}
      />
      <ReportTable
        title="Suppliers"
        columns={[
          { key: "name", header: "Supplier" },
          { key: "company", header: "Company" },
          { key: "phone", header: "Phone" },
          { key: "totalPurchase", header: "Purchases", align: "right", render: (s) => formatMoney(s.totalPurchase) },
          { key: "totalDue", header: "Due", align: "right", render: (s) => <span className="text-rose-500">{formatMoney(s.totalDue)}</span> },
        ]}
        data={report.suppliers || []}
        keyField="_id"
      />
    </div>
  );
}

function CashFlowReport({ report, isLoading }) {
  if (isLoading || !report) return <ReportSkeleton />;
  const f = report.flow || {};
  const rows = [
    { label: "Opening balance", value: f.openingBalance },
    { label: "Money in (total)", value: f.cashIn, pos: true },
    { label: "Customer payments & sales", value: f.customerPayments, pos: true },
    { label: "Other income", value: f.otherIn, pos: true },
    { label: "Money out (total)", value: f.cashOut, neg: true },
    { label: "Supplier payments & purchases", value: f.supplierPayments, neg: true },
    { label: "Refunds", value: f.refundsOut, neg: true },
    { label: "Operating expenses", value: f.otherOut, neg: true },
    { label: "Net cash flow", value: f.netCashFlow, strong: true },
    { label: "Closing balance", value: f.closingBalance, strong: true },
  ];
  return (
    <Card className="max-w-2xl">
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{r.label}</span>
              <span className={cn(
                "font-semibold",
                r.pos ? "text-emerald-600" : r.neg ? "text-rose-500" : r.strong ? "text-base text-zinc-900 dark:text-zinc-50" : ""
              )}>
                {typeof r.value === "number" ? formatMoney(r.value) : r.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportTable({ title, columns, data, keyField, small }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <DataTable
        className="border-0 rounded-none shadow-none"
        columns={columns}
        data={data}
        keyField={keyField}
        page={undefined}
      />
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800" />
      ))}
      <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60 md:col-span-4" />
    </div>
  );
}

function ExportButtons({ reportKey, params }) {
  const [exporting, setExporting] = useState(null);

  const doExport = async (format) => {
    setExporting(`${reportKey}:${format}`);
    try {
      await downloadFromServer(
        `/reports/export/${reportKey}/${format}?${new URLSearchParams(params)}`,
        `${reportKey}-report.${format === "csv" ? "csv" : format === "xlsx" ? "xlsx" : "pdf"}`
      );
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {[
        { format: "csv", icon: FileDown },
        { format: "xlsx", icon: FileSpreadsheet },
        { format: "pdf", icon: FileText },
      ].map(({ format, icon: Icon }) => (
        <button
          key={format}
          onClick={() => doExport(format)}
          disabled={exporting?.startsWith(reportKey)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Icon className="size-3.5" />
          {exporting === `${reportKey}:${format}` ? "…" : format.toUpperCase()}
        </button>
      ))}
    </div>
  );
}