"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Banknote, Printer } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery, useMutation } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Input, Field, Select } from "@/components/ui/Form";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SaleDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [payModal, setPayModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => api.get(`/sales/${id}`),
  });

  const sale = data?.sale;

  const cancelMutation = useMutation({
    method: "delete",
    url: `/sales/${id}`,
    onSuccessMessage: "Sale cancelled and stock restored",
    success: () => {
      setCancelTarget(false);
      queryClient.invalidateQueries({ queryKey: ["sale", id] });
    },
  });

  if (isLoading || !sale) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><Card><CardContent className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card></div>
          <Card><CardContent className="space-y-3 p-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <PageHeader
        title={`Sale ${sale.invoiceNumber}`}
        description={`Recorded ${formatDateTime(sale.saleDate)}`}
        actions={
          <>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Printer className="size-4" /> Print
            </button>
            {sale.status !== "cancelled" && sale.dueAmount > 0 && (
              <Button variant="secondary" onClick={() => setPayModal(true)}>
                <Banknote className="size-4" /> Record payment
              </Button>
            )}
            {sale.status !== "cancelled" && (
              <Button variant="danger" onClick={() => setCancelTarget(true)}>
                <Ban className="size-4" /> Cancel sale
              </Button>
            )}
          </>
        }
      />

      <Link href="/sales" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
        <ArrowLeft className="size-4" /> Back to sales
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                      <th className="px-4 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 font-semibold">Size</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((it, i) => (
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

          {sale.status === "cancelled" && (
            <Card className="border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5">
              <CardContent className="p-4 text-sm text-rose-600 dark:text-rose-400">
                This sale has been cancelled and inventory was restored.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <SummaryRow label="Subtotal" value={formatMoney(sale.subtotal)} />
              <SummaryRow label="Discount" value={`-${formatMoney(sale.discount)}`} muted={!sale.discount} />
              <SummaryRow label="Delivery" value={`+${formatMoney(sale.deliveryCharge)}`} muted={!sale.deliveryCharge} />
              <SummaryRow label="Total" value={formatMoney(sale.total)} strong />
              <div className="my-3 h-px bg-zinc-100 dark:bg-zinc-800" />
              <SummaryRow label="Paid" value={formatMoney(sale.paidAmount)} />
              <SummaryRow label="Due" value={formatMoney(sale.dueAmount)} tone={sale.dueAmount > 0 ? "rose" : "emerald"} />
              <div className="mb-3 mt-4 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Payment</span>
                <StatusBadge status={sale.paymentStatus} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Method</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{sale.paymentMethod}</span>
              </div>
              {sale.returnedQuantity > 0 && (
                <div className="mt-4 rounded-lg bg-violet-50 p-3 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  {sale.returnedQuantity} item{sale.returnedQuantity > 1 ? "s" : ""} returned · ৳{Number(sale.returnedAmount || 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-sm">
              {sale.customer ? (
                <div className="space-y-1">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">{sale.customer.name}</p>
                  <p className="text-zinc-500">{sale.customer.phone || "No phone"}</p>
                  {sale.customer.email && <p className="text-zinc-500">{sale.customer.email}</p>}
                  {sale.customer.address && <p className="text-zinc-500">{sale.customer.address}</p>}
                </div>
              ) : (
                <p className="text-zinc-400">Walk-in customer</p>
              )}
              {sale.notes && (
                <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60">{sale.notes}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {payModal && (
        <PaymentModal sale={sale} onClose={() => setPayModal(false)} onDone={() => {
          setPayModal(false);
          queryClient.invalidateQueries({ queryKey: ["sale", id] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }} />
      )}

      <ConfirmDialog
        open={cancelTarget}
        onClose={() => setCancelTarget(false)}
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
        title="Cancel this sale?"
        description="Cancelling restores all item quantities back to inventory. This should only be used for mistaken entries."
        confirmText="Cancel sale"
      />
    </div>
  );

  function PaymentModal({ sale: s, onClose, onDone }) {
    const [amount, setAmount] = useState(String(s.dueAmount || 0));
    const [method, setMethod] = useState(s.paymentMethod || "Cash");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
      setSaving(true);
      try {
        await api.post(`/sales/${s._id}/payments`, {
          amount: Number(amount) || 0,
          method,
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
        description={`Collecting from ${s.customer?.name || "walk-in"} for ${s.invoiceNumber}. Due: ${formatMoney(s.dueAmount)}`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={saving}>Record payment</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Amount (৳)" required>
            <Input type="number" min="0" max={s.dueAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
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
}

function SummaryRow({ label, value, strong, muted, tone }) {
  const tones = {
    rose: "text-rose-500",
    emerald: "text-emerald-600",
  };
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={strong ? "text-base font-bold text-zinc-900 dark:text-zinc-50" : `font-medium ${tone ? tones[tone] : muted ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-200"}`}>
        {value}
      </span>
    </div>
  );
}