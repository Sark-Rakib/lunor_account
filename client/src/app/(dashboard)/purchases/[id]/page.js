"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, Printer, Truck } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["purchase", id],
    queryFn: () => api.get(`/purchases/${id}`),
  });

  const purchase = data?.purchase;

  if (isLoading || !purchase) {
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
        title={`Purchase ${purchase.purchaseNumber}`}
        description={`Recorded ${formatDateTime(purchase.purchaseDate)}`}
        actions={
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            <Printer className="size-4" /> Print
          </button>
        }
      />
      <Link href="/purchases" className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
        <ArrowLeft className="size-4" /> Back to purchases
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3"><CardTitle>Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                      <th className="px-4 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Unit cost</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items.map((it, i) => (
                      <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">{it.name}</p>
                          <p className="text-xs text-zinc-400">{it.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-200">{it.quantity}</td>
                        <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-300">{formatMoney(it.price)}</td>
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
            <CardHeader className="pb-3"><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between py-1.5 text-sm"><span className="text-zinc-500">Total</span><span className="text-base font-bold text-zinc-900 dark:text-zinc-50">{formatMoney(purchase.totalAmount)}</span></div>
              <div className="flex items-center justify-between py-1.5 text-sm"><span className="text-zinc-500">Paid</span><span className="font-medium text-zinc-700 dark:text-zinc-200">{formatMoney(purchase.paidAmount)}</span></div>
              <div className="flex items-center justify-between py-1.5 text-sm"><span className="text-zinc-500">Due</span><span className="font-medium text-rose-500">{formatMoney(purchase.dueAmount)}</span></div>
              <div className="mb-3 mt-4 flex items-center justify-between text-sm"><span className="text-zinc-500">Payment</span><StatusBadge status={purchase.paymentStatus} /></div>
              <div className="flex items-center justify-between text-sm"><span className="text-zinc-500">Method</span><span className="font-medium text-zinc-700 dark:text-zinc-200">{purchase.paymentMethod}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle>Supplier</CardTitle></CardHeader>
            <CardContent className="pt-2 text-sm">
              {purchase.supplier ? (
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Truck className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-800 dark:text-zinc-100">{purchase.supplier.name}</p>
                    <p className="text-xs text-zinc-500">{purchase.supplier.company || ""}{purchase.supplier.phone ? ` · ${purchase.supplier.phone}` : ""}</p>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400">No supplier recorded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}