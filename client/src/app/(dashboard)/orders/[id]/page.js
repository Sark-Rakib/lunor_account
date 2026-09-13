"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Check, Printer, Truck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Input, Field, Select } from "@/components/ui/Form";
import { ORDER_FLOW, ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/constants";
import { cn, formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [payModal, setPayModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get(`/orders/${id}`),
  });

  const order = data?.order;

  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><Card><CardContent className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card></div>
          <Card><CardContent className="space-y-3 p-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
        </div>
      </div>
    );
  }

  const isAdvanced = ["Cancelled", "Returned", "Refunded"].includes(order.orderStatus);
  const nextFlow = isAdvanced ? null : ORDER_FLOW[ORDER_FLOW.indexOf(order.orderStatus) + 1];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${formatDateTime(order.orderDate)}`}
        actions={
          <>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Printer className="size-4" /> Print
            </button>
            {order.dueAmount > 0 && (
              <Button variant="secondary" onClick={() => setPayModal(true)}>
                <Banknote className="size-4" /> Record payment
              </Button>
            )}
            {!isAdvanced && (
              <Button
                onClick={() => setStatusModal(true)}
                className={nextFlow === "Delivered" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                <Truck className="size-4" /> Update status
              </Button>
            )}
          </>
        }
      />

      <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <StatusTimeline order={order} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                      <th className="px-4 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 font-semibold">Size</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, i) => (
                      <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">{it.name}</p>
                          <p className="text-xs text-zinc-400">{it.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{it.size || "—"}</td>
                        <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">{it.quantity}</td>
                        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">{formatMoney(it.sellingPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(it.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Row label="Subtotal" value={formatMoney(order.subtotal)} />
              <Row label="Discount" value={`-${formatMoney(order.discount)}`} muted={!order.discount} />
              <Row label="Delivery" value={`+${formatMoney(order.deliveryCharge)}`} muted={!order.deliveryCharge} />
              <Row label="Total" value={formatMoney(order.total)} strong />
              <div className="my-3 h-px bg-zinc-100 dark:bg-zinc-800" />
              <Row label="Paid" value={formatMoney(order.paidAmount)} />
              <Row label="Due" value={formatMoney(order.dueAmount)} tone={order.dueAmount > 0 ? "rose" : "emerald"} />
              <div className="mb-3 mt-4 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Payment</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Method</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{order.paymentMethod}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-sm">
              {order.customer ? (
                <div className="space-y-1">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">{order.customer.name}</p>
                  <p className="text-zinc-500">{order.customer.phone || "No phone"}</p>
                  {order.customer.email && <p className="text-zinc-500">{order.customer.email}</p>}
                  {order.customer.address && <p className="text-zinc-500">{order.customer.address}</p>}
                </div>
              ) : (
                <p className="text-zinc-400">Walk-in / guest customer</p>
              )}
              {order.notes && <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60">{order.notes}</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {payModal && (
        <OrderPaymentModal order={order} onClose={() => setPayModal(false)} onDone={() => { setPayModal(false); queryClient.invalidateQueries({ queryKey: ["order", id] }); }} />
      )}

      {statusModal && (
        <OrderStatusModal order={order} onClose={() => setStatusModal(false)} onDone={() => { setStatusModal(false); queryClient.invalidateQueries({ queryKey: ["order", id] }); }} />
      )}
    </div>
  );
}

function StatusTimeline({ order }) {
  const timeline = order.timeline || [];
  const reached = new Set(timeline.map((t) => t.status));
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Order status: <span className="ml-1"><StatusBadge status={order.orderStatus} /></span></CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-5 gap-1">
          {ORDER_FLOW.map((status, i) => {
            const done = reached.has(status);
            const isFinal = status === order.orderStatus;
            return (
              <div key={status} className="flex flex-col items-center gap-1.5">
                <div className="flex w-full items-center">
                  <div className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done ? "bg-indigo-500" : "bg-zinc-200 dark:bg-zinc-700")} />
                  <div className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px]",
                    done ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                  )}>
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </div>
                  <div className={cn("h-0.5 flex-1", i === ORDER_FLOW.length - 1 ? "bg-transparent" : reached.has(ORDER_FLOW[i + 1]) ? "bg-indigo-500" : "bg-zinc-200 dark:bg-zinc-700")} />
                </div>
                <span className={cn("text-[10px] font-medium", isFinal ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400")}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>

        {timeline.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className={cn("mt-1 size-2 shrink-0 rounded-full", i === timeline.length - 1 ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-600")} />
                <div>
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">{t.status}<span className="ml-1 font-normal text-zinc-400">· {formatDateTime(t.at)}</span></p>
                  {t.note && <p className="text-xs text-zinc-500">{t.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderPaymentModal({ order, onClose, onDone }) {
  const [amount, setAmount] = useState(String(order.dueAmount || 0));
  const [method, setMethod] = useState(order.paymentMethod || "Cash");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (Number(amount) > order.dueAmount) {
        toast.error("Amount exceeds the due balance");
        return;
      }
      await api.put(`/orders/${order._id}`, {
        customer: order.customer?._id || null,
        items: order.items.map((it) => ({
          product: it.product,
          size: it.size,
          quantity: it.quantity,
          sellingPrice: it.sellingPrice,
        })),
        discount: order.discount,
        deliveryCharge: order.deliveryCharge,
        paymentMethod: method,
        paidAmount: Number(order.paidAmount || 0) + (Number(amount) || 0),
        orderStatus: order.orderStatus,
        orderDate: order.orderDate,
      });
      toast.success("Payment recorded");
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      description={`For ${order.orderNumber}. Due: ${formatMoney(order.dueAmount)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Record payment</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount (৳)" required>
          <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function OrderStatusModal({ order, onClose, onDone }) {
  const [status, setStatus] = useState(order.orderStatus);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.put(`/orders/${order._id}/status`, { status, reason });
      toast.success(`Order marked as ${status}`);
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const hint = {
    Confirmed: "Stock is deducted when an order is confirmed.",
    Shipped: "Revenue is recognized when shipped.",
    Delivered: "Order is completed and revenue recognized.",
    Cancelled: "Stock is restored and no further changes apply.",
    Returned: "Record returns via the Returns module.",
  }[status];

  return (
    <Modal
      open
      onClose={onClose}
      title="Update order status"
      description="Changing status may deduct/restore stock and recognize revenue."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Update status</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="New status" required>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Note / reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </Field>
        {hint && (
          <p className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{hint}</p>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value, strong, muted, tone }) {
  const tones = { rose: "text-rose-500", emerald: "text-emerald-600" };
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={strong ? "text-base font-bold text-zinc-900 dark:text-zinc-50" : `font-medium ${tone ? tones[tone] : muted ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-200"}`}>{value}</span>
    </div>
  );
}