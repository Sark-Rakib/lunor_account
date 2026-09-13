"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery, useMutation } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Input, Field, Select } from "@/components/ui/Form";
import { RETURN_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ReturnDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [statusModal, setStatusModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["return", id],
    queryFn: () => api.get(`/returns/${id}`),
  });

  const refund = data?.return;

  if (isLoading || !refund) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Card><CardContent className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Return ${refund.returnNumber}`}
        description={`Processed ${formatDateTime(refund.returnDate)}`}
        actions={
          <>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Printer className="size-4" /> Print
            </button>
            {refund.refundStatus !== "refunded" && (
              <Button onClick={() => setStatusModal(true)}><RotateCcw className="size-4" /> Update status</Button>
            )}
          </>
        }
      />
      <Link href="/returns" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
        <ArrowLeft className="size-4" /> Back to returns
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3"><CardTitle>Returned items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                      <th className="px-4 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 font-semibold">Condition</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Refund/unit</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refund.items.map((it, i) => (
                      <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">{it.name} <span className="text-zinc-400">({it.size || "no size"})</span></p>
                          <p className="text-xs text-zinc-400">{it.sku}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={it.condition} /></td>
                        <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">{it.quantity}</td>
                        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">{formatMoney(it.refundPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-500">−{formatMoney(it.refundPrice * it.quantity)}</td>
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
            <CardHeader className="pb-3"><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-zinc-500">Refund amount</span>
                <span className="text-base font-bold text-rose-500">−{formatMoney(refund.totalRefundAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-zinc-500">Original source</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{refund.sale?.invoiceNumber || refund.order?.orderNumber || "Direct"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-zinc-500">Reason</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{refund.reason}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-zinc-500">Method</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{refund.refundMethod}</span>
              </div>
              <div className="mb-3 mt-4 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Status</span>
                <StatusBadge status={refund.refundStatus} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="pt-2 text-sm">
              {refund.customer ? (
                <p className="font-medium text-zinc-800 dark:text-zinc-100">{refund.customer.name}<span className="ml-1 text-zinc-400">{refund.customer.phone ? `· ${refund.customer.phone}` : ""}</span></p>
              ) : (
                <p className="text-zinc-400">Not recorded</p>
              )}
              {refund.notes && <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60">{refund.notes}</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {statusModal && (
        <ReturnStatusModal refund={refund} onClose={() => setStatusModal(false)} onDone={() => { setStatusModal(false); queryClient.invalidateQueries({ queryKey: ["return", id] }); }} />
      )}
    </div>
  );
}

function ReturnStatusModal({ refund, onClose, onDone }) {
  const [status, setStatus] = useState(refund.refundStatus);
  const mutation = useMutation({
    method: "put",
    url: `/returns/${refund._id}/status`,
    body: { status },
    onSuccessMessage: "Return status updated",
    success: () => onDone(),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Update return status"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ status })} loading={mutation.isPending}>Update</Button>
        </>
      }
    >
      <Field label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {RETURN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
      <p className="mt-3 text-xs text-zinc-400">Marking as &quot;refunded&quot; issues the refund to the customer account &amp; ledger.</p>
    </Modal>
  );
}