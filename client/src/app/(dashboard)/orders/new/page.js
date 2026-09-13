"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { useCustomers, useProducts } from "@/hooks/useOptions";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select, DateInput, Textarea } from "@/components/ui/Form";
import ItemsEditor from "@/components/SaleItemsEditor";
import { ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, todayStr } from "@/lib/utils";

export default function NewOrderPage() {
  const router = useRouter();
  const { data: productsData } = useProducts({ params: { limit: 250 } });
  const { data: customersData } = useCustomers({ params: { limit: 250 } });
  const products = productsData?.data || [];
  const customers = customersData?.data || [];

  const [form, setForm] = useState({
    customer: "",
    items: [],
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: "Cash",
    paidAmount: 0,
    orderStatus: "Pending",
    orderDate: todayStr(),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const discount = Number(form.discount) || 0;
  const deliveryCharge = Number(form.deliveryCharge) || 0;
  const total = Math.max(0, subtotal - discount + deliveryCharge);
  const paid = Math.min(Number(form.paidAmount) || 0, total);

  const submit = async () => {
    if (form.items.length === 0) return toast.error("Add at least one product");
    if (form.items.some((it) => !it.product)) return toast.error("Every item needs a product selected");
    setSaving(true);
    try {
      const payload = {
        customer: form.customer || null,
        items: form.items.map((it) => ({
          product: it.product,
          size: it.size || "",
          quantity: Number(it.quantity),
          sellingPrice: Number(it.price),
        })),
        discount,
        deliveryCharge,
        paymentMethod: form.paymentMethod,
        paidAmount: paid,
        orderStatus: form.orderStatus,
        orderDate: form.orderDate,
        notes: form.notes,
      };
      const res = await api.post("/orders", payload);
      toast.success("Order created");
      router.push(`/orders/${res.order?._id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Order"
        description="Create a customer order. Stock is reserved when confirmed."
        actions={
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
            <ChevronLeft className="size-4" /> Back to orders
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Customer">
                  <Select value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                    <option value="">Walk-in / guest</option>
                    {customers.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.phone || "no phone"})</option>)}
                  </Select>
                </Field>
                <Field label="Order date">
                  <DateInput value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
                </Field>
                <Field label="Initial status">
                  <Select value={form.orderStatus} onChange={(e) => setForm({ ...form, orderStatus: e.target.value })}>
                    {ORDER_STATUSES.filter((s) => !["Returned", "Refunded"].includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
              </div>
              <ItemsEditor products={products} items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <Field label="Discount (৳)">
                <Input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </Field>
              <Field label="Delivery charge (৳)">
                <Input type="number" min="0" value={form.deliveryCharge} onChange={(e) => setForm({ ...form, deliveryCharge: e.target.value })} />
              </Field>
              <Field label="Payment method">
                <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Advance paid (৳)">
                <Input type="number" min="0" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
              </Field>

              <div className="rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800/60">
                <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                <div className="mt-1 flex justify-between text-zinc-500"><span>Discount</span><span>-{formatMoney(discount)}</span></div>
                <div className="mt-1 flex justify-between text-zinc-500"><span>Delivery</span><span>+{formatMoney(deliveryCharge)}</span></div>
                <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                  <span>Total</span><span>{formatMoney(total)}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>Due on delivery</span><span className="font-semibold text-amber-600">{formatMoney(total - paid)}</span>
                </div>
              </div>

              <Field label="Notes">
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </Field>

              <Button className="w-full" onClick={submit} loading={saving}>
                {saving ? "Creating…" : "Create order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}