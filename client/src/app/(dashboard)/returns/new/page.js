"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { useCustomers } from "@/hooks/useOptions";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, DateInput, Textarea } from "@/components/ui/Form";
import { RETURN_CONDITIONS, RETURN_REASONS, PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, cn, todayStr } from "@/lib/utils";

export default function NewReturnPage() {
  const router = useRouter();
  const { data: customersData } = useCustomers({ params: { limit: 250 } });
  const customers = customersData?.data || [];

  const [sourceType, setSourceType] = useState("sale");
  const [sourceId, setSourceId] = useState("");
  const [keys, setKeys] = useState(null);
  const [items, setItems] = useState({});
  const [condition, setCondition] = useState({});
  const [reason, setReason] = useState("Size issue");
  const [refundMethod, setRefundMethod] = useState("Cash");
  const [refundStatus, setRefundStatus] = useState("processed");
  const [returnDate, setReturnDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: sourceData, isLoading: loadingSource } = useQuery({
    queryKey: ["return-source", sourceType, sourceId],
    queryFn: () => api.get(sourceType === "sale" ? `/sales/${sourceId}` : `/orders/${sourceId}`),
    enabled: !!sourceId,
  });
  const source = sourceType === "sale" ? sourceData?.sale : sourceData?.order;
  const listKey = `${sourceType}-${sourceId}`;

  const loadSourceList = async () => {
    setKeys(null);
    if (!sourceId) return setKeys([]);
    const { data } = await api.get(sourceType === "sale" ? "/sales" : "/orders", { params: { limit: 100, status: sourceType === "sale" ? "completed" : undefined } });
    setKeys(
      (data?.data || []).map((d) => ({
        value: d._id,
        label: `${sourceType === "sale" ? d.invoiceNumber : d.orderNumber} · ${d.customerName || d.customer?.name || "Walk-in"} · ${formatMoney(d.total)}`,
      }))
    );
  };

  const toggleItem = (idx) => {
    const it = source.items[idx];
    const key = String(it.product);
    setItems((prev) => ({
      ...prev,
      [key]: prev[key] ? undefined : String(it.quantity - (it.returnedQuantity || 0) || 1),
    }));
  };

  const setQty = (key, value) => {
    setItems((prev) => ({ ...prev, [key]: value }));
  };

  const selectedItems = (source?.items || []).filter((it) => items[String(it.product)]);
  const totalRefund = selectedItems.reduce((s, it) => {
    const qty = Math.min(Number(items[String(it.product)]) || 0, (it.quantity || 0) - (it.returnedQuantity || 0));
    const price = Number(it.sellingPrice) || 0;
    return s + qty * price;
  }, 0);

  const submit = async () => {
    if (selectedItems.length === 0) return toast.error("Select at least one item to return");
    setSaving(true);
    try {
      const payloadItems = selectedItems.map((it) => ({
        product: it.product,
        quantity: Math.min(Number(items[String(it.product)]) || 0, (it.quantity || 0) - (it.returnedQuantity || 0)),
        refundPrice: it.sellingPrice,
        purchasePrice: it.purchasePrice || 0,
        condition: condition[String(it.product)] || "good",
      }));
      if (payloadItems.some((p) => p.quantity < 1)) {
        setSaving(false);
        return toast.error("Quantities must be at least 1");
      }
      const payload = {
        ...(sourceType === "sale" ? { sale: sourceId } : { order: sourceId }),
        reason,
        refundMethod,
        refundStatus,
        returnDate,
        notes,
        items: payloadItems,
      };
      const res = await api.post("/returns", payload);
      toast.success("Return processed");
      router.push(`/returns/${res.return?._id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Process Return"
        description="Refund items back to customers and restore stock."
        actions={
          <Link href="/returns" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
            <ChevronLeft className="size-4" /> Back to returns
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Source document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-wrap items-end gap-4">
                <Field label="Source type">
                  <Select value={sourceType} onChange={(e) => { setSourceType(e.target.value); setSourceId(""); setItems({}); setCondition({}); }}>
                    <option value="sale">Sale (invoice)</option>
                    <option value="order">Order</option>
                  </Select>
                </Field>
                <Field label={sourceType === "sale" ? "Invoice number" : "Order number"} className="flex-1 min-w-56">
                  <input
                    value={sourceId}
                    onChange={async (e) => {
                      setSourceId(e.target.value);
                      setItems({});
                      setCondition({});
                    }}
                    onBlur={loadSourceList}
                    placeholder={`Type ${sourceType === "sale" ? "invoice" : "order"} # to search…`}
                    className={cn("w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm")}
                  />
                </Field>
                <Button variant="secondary" onClick={loadSourceList} type="button">Search</Button>
              </div>

              {keys && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-zinc-400">Select a {sourceType === "sale" ? "sale" : "order"}:</p>
                  {keys.length === 0 && <p className="text-sm text-zinc-400">No matching {sourceType === "sale" ? "sales" : "orders"}.</p>}
                  {keys.map((k) => (
                    <button
                      key={k.value}
                      onClick={() => { setSourceId(k.value); setKeys(null); setItems({}); setCondition({}); }}
                      className={cn("block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors", sourceId === k.value ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300" : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50")}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              )}

              {source && (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="border-b border-zinc-100 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800">
                    Items from {source.invoiceNumber || source.orderNumber}
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {source.items.map((it, i) => {
                      const available = (it.quantity || 0) - (it.returnedQuantity || 0);
                      const key = String(it.product);
                      const selected = !!items[key];
                      return (
                        <label key={i} className={cn("flex items-center justify-between gap-3 px-3 py-2.5 text-sm", selected ? "bg-indigo-50/50 dark:bg-indigo-500/5" : "")}>
                          <div className="flex min-w-0 items-center gap-3">
                            <input type="checkbox" checked={selected} onChange={() => toggleItem(i)} className="size-4 accent-indigo-600" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-800 dark:text-zinc-100">{it.name} <span className="text-zinc-400">({it.size || "no size"})</span></p>
                              <p className="text-xs text-zinc-400">{it.sku} · {formatMoney(it.sellingPrice)} each · {available} available</p>
                            </div>
                          </div>
                          {selected && (
                            <div className="flex items-center gap-2">
                              <Input type="number" min="1" max={available} value={items[key]} onChange={(e) => setQty(key, e.target.value)} className="h-8 w-20 text-xs" />
                              <Select value={condition[key] || "good"} onChange={(e) => setCondition({ ...condition, [key]: e.target.value })} className="h-8 w-28 text-xs">
                                {RETURN_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                              </Select>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <Field label="Return reason">
                <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                  {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Refund method">
                <Select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Refund status">
                <Select value={refundStatus} onChange={(e) => setRefundStatus(e.target.value)}>
                  <option value="processed">Processed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </Select>
              </Field>
              <Field label="Return date">
                <DateInput value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </Field>

              <div className="rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800/60">
                <div className="flex justify-between"><span className="text-zinc-500">Items returned</span><span>{selectedItems.length}</span></div>
                <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                  <span>Refund amount</span><span className="text-rose-500">−{formatMoney(totalRefund)}</span>
                </div>
              </div>

              <Field label="Notes">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes about the return" />
              </Field>

              <Button className="w-full" onClick={submit} loading={saving} disabled={loadingSource}>
                {saving ? "Processing…" : "Process return"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}