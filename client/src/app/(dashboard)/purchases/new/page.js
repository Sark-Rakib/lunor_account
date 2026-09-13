"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { useProducts, useSuppliers } from "@/hooks/useOptions";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select, DateInput, Textarea } from "@/components/ui/Form";
import ItemsEditor from "@/components/SaleItemsEditor";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, todayStr } from "@/lib/utils";

export default function NewPurchasePage() {
  const router = useRouter();
  const { data: productsData } = useProducts({ params: { limit: 250 } });
  const { data: suppliersData } = useSuppliers({ params: { limit: 250 } });
  const products = productsData?.data || [];
  const suppliers = suppliersData?.data || [];

  const [form, setForm] = useState({
    supplier: "",
    items: [],
    paidAmount: 0,
    paymentMethod: "Cash",
    purchaseDate: todayStr(),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const totalAmount = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const paid = Math.min(Number(form.paidAmount) || 0, totalAmount);

  const submit = async () => {
    if (form.items.length === 0) return toast.error("Add at least one product");
    if (form.items.some((it) => !it.product)) return toast.error("Every item needs a product selected");
    setSaving(true);
    try {
      const payload = {
        supplier: form.supplier || null,
        items: form.items.map((it) => ({
          product: it.product,
          quantity: Number(it.quantity),
          price: Number(it.price),
        })),
        paidAmount: paid,
        paymentMethod: form.paymentMethod,
        purchaseDate: form.purchaseDate,
        notes: form.notes,
      };
      await api.post("/purchases", payload);
      toast.success("Purchase recorded");
      router.push("/purchases");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Purchase"
        description="Record a stock purchase. Inventory and supplier balances update automatically."
        actions={
          <Link href="/purchases" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
            <ChevronLeft className="size-4" /> Back to purchases
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Supplier">
                  <Select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
                    <option value="">No supplier</option>
                    {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}{s.company ? ` (${s.company})` : ""}</option>)}
                  </Select>
                </Field>
                <Field label="Purchase date">
                  <DateInput value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                </Field>
              </div>
              <ItemsEditor products={products} items={form.items} onChange={(items) => setForm({ ...form, items })} purchasing priceLabel="Unit cost" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <Field label="Amount paid (৳)">
                <Input type="number" min="0" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
              </Field>
              <Field label="Payment method">
                <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
              <div className="rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800/60">
                <div className="flex justify-between text-zinc-500"><span>Total amount</span><span>{formatMoney(totalAmount)}</span></div>
                <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                  <span>Payable</span><span>{formatMoney(totalAmount - paid)}</span>
                </div>
              </div>
              <Field label="Notes">
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </Field>
              <Button className="w-full" onClick={submit} loading={saving}>
                {saving ? "Recording…" : "Record purchase"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}