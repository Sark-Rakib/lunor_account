"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Target as TargetIcon, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Form";
import { formatMoney, formatCompact, todayStr } from "@/lib/utils";
import { cn } from "@/lib/utils";

function monthLabel(month) {
  const d = new Date(`${month}-01T00:00:00`);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function TargetsPage() {
  const queryClient = useQueryClient();
  const thisMonth = todayStr().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [saving, setSaving] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["target", month],
    queryFn: () => api.get("/targets/current", { params: { month } }),
  });

  const progress = data?.progress || {};
  const rows = [
    { key: "revenue", label: "Revenue", current: progress.revenue?.current, target: progress.revenue?.target, percent: progress.revenue?.percent, money: true },
    { key: "orders", label: "Orders", current: progress.orders?.current, target: progress.orders?.target, percent: progress.orders?.percent },
    { key: "products", label: "Products sold", current: progress.products?.current, target: progress.products?.target, percent: progress.products?.percent },
    { key: "profit", label: "Net profit", current: progress.profit?.current, target: progress.profit?.target, percent: progress.profit?.percent, money: true },
  ];

  const save = async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    setSaving(true);
    try {
      await api.post("/targets", {
        month,
        revenueTarget: Number(form.revenue) || 0,
        orderTarget: Number(form.orders) || 0,
        productSalesTarget: Number(form.products) || 0,
        profitTarget: Number(form.profit) || 0,
      });
      toast.success("Targets saved");
      queryClient.invalidateQueries({ queryKey: ["target"] });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const target = data?.target || {};
  const [form, setForm] = useState();
  const [formMonth, setFormMonth] = useState(null);

  if (target.month && formMonth !== target.month) {
    setFormMonth(target.month);
    setForm({
      revenue: target.revenueTarget || "",
      orders: target.orderTarget || "",
      products: target.productSalesTarget || "",
      profit: target.profitTarget || "",
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales Targets"
        description="Set goals and watch monthly progress."
        actions={
          <div className="flex items-center gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
            <Button onClick={save} loading={saving} disabled={!form}>Save targets</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.key}>
            <CardHeader>
              <CardTitle>{r.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold">
                    {r.money ? formatCompact(r.current || 0) : (r.current || 0).toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-zinc-400">/ {r.money ? formatCompact(r.target || 0) : (r.target || 0).toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-zinc-400">{monthLabel(month)}</p>
                </div>
                <span className={cn("rounded-lg px-2 py-1 text-sm font-bold", (r.percent || 0) >= 100 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300")}>
                  {r.percent || 0}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className={cn("h-full rounded-full transition-all", (r.percent || 0) >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${Math.min(100, r.percent || 0)}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Field label={r.money ? "Target (৳)" : "Target"}>
                  <Input type="number" value={form?.[r.key] ?? ""} disabled={!form} onChange={(e) => setForm((f) => ({ ...f, [r.key]: e.target.value }))} placeholder="0" />
                </Field>
                <div className="rounded-lg bg-zinc-50 p-2.5 text-center dark:bg-zinc-800/60">
                  <p className="text-[10px] font-semibold uppercase text-zinc-400">Actual</p>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{r.money ? formatCompact(r.current || 0) : (r.current || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isFetching && <p className="text-xs text-zinc-400">Refreshing…</p>}
    </div>
  );
}