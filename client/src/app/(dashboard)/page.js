"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  Package,
  PiggyBank,
  ShoppingCart,
} from "lucide-react";
import { useQuery } from "@/hooks/queries";
import { api, getStoredAuth } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import PeriodSelector from "@/components/PeriodSelector";
import { AreaChartCard, BarChartCard, DonutChartCard } from "@/components/charts";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

function buildParams({ preset, custom }) {
  if (custom) return { dateFrom: custom.from, dateTo: custom.to };
  return { period: preset || "month" };
}

export default function DashboardPage() {
  const [range, setRange] = useState({ preset: "month", custom: null });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => api.get("/dashboard", { params: buildParams(range) }),
    enabled: typeof window !== "undefined" && !!getStoredAuth(),
  });

  const dash = data?.dashboard;
  const kpis = dash?.kpis || {};
  const miniPeriods = dash?.miniPeriods || {};
  const charts = dash?.charts || {};

  const trendOf = (k) => {
    if (!k) return 0;
    return k.percent ?? 0;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your business performance."
        actions={<PeriodSelector value={range.preset} custom={range.custom} onChange={setRange} />}
      />

      {isError && (
        <Card className="border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-rose-600 dark:text-rose-400">
            <AlertTriangle className="size-5" />
            Failed to load dashboard: {error?.message}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        <StatCard title="Revenue" value={kpis.revenue?.current} icon={Banknote} iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" trend={trendOf(kpis.revenue)} loading={isLoading} subtitle="this period" />
        <StatCard title="Net Profit" value={kpis.netProfit?.current} icon={PiggyBank} iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" trend={trendOf(kpis.netProfit)} loading={isLoading} subtitle="this period" />
        <StatCard title="Total Sales" value={kpis.totalSales?.current} icon={ShoppingCart} iconClass="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" trend={trendOf(kpis.totalSales)} loading={isLoading} subtitle="sales & orders" />
        <StatCard title="Gross Margin" value={`${kpis.grossMargin ?? 0}%`} icon={CircleDollarSign} iconClass="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" loading={isLoading} subtitle="gross profit margin" />
        <StatCard title="Receivable" value={kpis.totalReceivable} icon={CreditCard} iconClass="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" loading={isLoading} subtitle="from customers" />
        <StatCard title="Payable" value={kpis.totalPayable} icon={HandCoins} iconClass="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" loading={isLoading} subtitle="to suppliers" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        <MiniPeriodCard label="Sold Today" period={miniPeriods.today} loading={isLoading} highlight="text-indigo-600 dark:text-indigo-400" />
        <MiniPeriodCard label="Sold This Week" period={miniPeriods.week} loading={isLoading} highlight="text-sky-600 dark:text-sky-400" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 md:gap-4">
        <AreaChartCard
          title="Revenue & Expenses"
          data={charts.salesOverview || []}
          dataKey="revenue"
          loading={isLoading}
          subtitle="Daily breakdown in the selected period"
        />
        <DonutChartCard
          title="Sales by Category"
          data={charts.salesByCategory || []}
          loading={isLoading}
        />
        <DonutChartCard
          title="Payment Methods"
          data={charts.paymentMethods || []}
          loading={isLoading}
        />
        <BarChartCard
          title="Top Products"
          data={charts.topProducts || []}
          dataKey="revenue"
          xKey="name"
          loading={isLoading}
        />
        <BarChartCard
          title="Expense Breakdown"
          data={charts.expenseBreakdown || []}
          dataKey="value"
          xKey="name"
          loading={isLoading}
        />
        <OrderStatusCard data={charts.orderStatus || []} loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentCard
          title="Recent Sales"
          href="/sales"
          items={dash?.recent?.sales || []}
          emptyIcon={ShoppingCart}
          emptyTitle="No sales yet"
          emptyHint="Record your first sale to see it here."
          actionHref="/sales"
          actionLabel="New Sale"
          loading={isLoading}
        >
          {(s) => (
            <Link key={s._id} href={`/sales/${s._id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <ShoppingCart className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{s.invoiceNumber}</p>
                  <p className="truncate text-xs text-zinc-400">{s.customerName || s.customer?.name || "Walk-in customer"} · {formatDateTime(s.saleDate)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{formatMoney(s.total)}</p>
                <StatusBadge status={s.paymentStatus} className="mt-0.5" />
              </div>
            </Link>
          )}
        </RecentCard>

        <RecentCard
          title="Recent Orders"
          href="/orders"
          items={dash?.recent?.orders || []}
          emptyIcon={Package}
          emptyTitle="No orders yet"
          emptyHint="Create your first order to start fulfilling."
          actionHref="/orders"
          actionLabel="New Order"
          loading={isLoading}
        >
          {(o) => (
            <Link key={o._id} href={`/orders/${o._id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <Package className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{o.orderNumber}</p>
                  <p className="truncate text-xs text-zinc-400">{o.customerName || o.customer?.name || "Walk-in customer"} · {formatDateTime(o.orderDate)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{formatMoney(o.total)}</p>
                <StatusBadge status={o.orderStatus} className="mt-0.5" />
              </div>
            </Link>
          )}
        </RecentCard>
      </div>

      <LowStockCard products={dash?.lowStock || []} loading={isLoading} />
    </div>
  );
}

function OrderStatusCard({ data, loading }) {
  if (loading) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" /><div className="mt-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />)}</div></div>;
  }
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = {
    Pending: "bg-amber-500",
    Confirmed: "bg-sky-500",
    Processing: "bg-blue-500",
    Shipped: "bg-indigo-500",
    Delivered: "bg-emerald-500",
    Cancelled: "bg-zinc-400",
    Returned: "bg-violet-500",
    Refunded: "bg-rose-500",
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {data.length === 0 && <p className="text-sm text-zinc-400">No orders in this period.</p>}
        {data.map((d) => (
          <div key={d.name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">{d.name}</span>
              <span className="text-zinc-400">{d.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className={`h-full rounded-full ${colors[d.name] || "bg-zinc-400"}`} style={{ width: `${(d.value / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentCard({ title, href, items = [], children, emptyIcon, emptyTitle, emptyHint, actionHref, actionLabel, loading }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <Link href={href} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
          View all →
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyHint}
            action={<Link href={actionHref}><Button size="sm">{actionLabel}</Button></Link>}
          />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => children(item))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockCard({ products, loading }) {
  if (loading) return null;
  if (!products || products.length === 0) return null;
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4" /> Low / Out of Stock
        </CardTitle>
        <Link href="/products" className="text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400">
          View products →
        </Link>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-3">
        {products.map((p) => (
          <Link key={p._id} href="/products" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">{p.name}</span>
            <span className={p.currentStock <= 0 ? "font-semibold text-rose-600" : "font-semibold text-amber-600"}>
              {p.currentStock} left
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniPeriodCard({ label, period, loading, highlight }) {
  const p = period || {};
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4 md:p-5">
        <div>
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          {loading ? (
            <p className="mt-1 h-8 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          ) : (
            <p className={`mt-1 text-2xl font-bold tracking-tight ${highlight}`}>{formatMoney(p.revenue)}</p>
          )}
          <p className="mt-1 text-xs text-zinc-400">
            Profit {loading ? "—" : formatMoney(p.grossProfit)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 ${loading ? "opacity-0" : ""}`}>{p.salesCount ?? 0}</p>
          <p className="text-xs text-zinc-400">{loading ? "loading…" : "sales"}</p>
        </div>
      </CardContent>
    </Card>
  );
}