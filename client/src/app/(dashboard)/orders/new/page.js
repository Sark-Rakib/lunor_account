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
import {
  Field,
  Input,
  Select,
  DateInput,
  Textarea,
} from "@/components/ui/Form";
import ItemsEditor from "@/components/SaleItemsEditor";
import { ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, todayStr } from "@/lib/utils";

export default function NewOrderPage() {
  const router = useRouter();

  const { data: productsData } = useProducts({
    params: { limit: 250 },
  });

  const { data: customersData } = useCustomers({
    params: { limit: 250 },
  });

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

  const subtotal = form.items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0,
  );

  const discount = Number(form.discount) || 0;
  const deliveryCharge = Number(form.deliveryCharge) || 0;

  const total = Math.max(0, subtotal - discount + deliveryCharge);

  const paid = Math.min(Number(form.paidAmount) || 0, total);

  const submit = async () => {
    if (form.items.length === 0) {
      return toast.error("Add at least one product");
    }

    if (form.items.some((item) => !item.product)) {
      return toast.error("Every item needs a product selected");
    }

    setSaving(true);

    try {
      const payload = {
        customer: form.customer || null,

        items: form.items.map((item) => ({
          product: item.product,
          size: item.size || "",
          quantity: Number(item.quantity),
          sellingPrice: Number(item.price),
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
      {/* Header */}
      <PageHeader
        title="New Order"
        description="Create a customer order. Stock is reserved when confirmed."
        actions={
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-100"
          >
            <ChevronLeft className="size-4" />
            <span>Back to orders</span>
          </Link>
        }
      />

      {/* Main Layout */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-5">
              {/* Customer / Date / Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Customer */}
                <Field label="Customer">
                  <Select
                    value={form.customer}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        customer: e.target.value,
                      })
                    }
                  >
                    <option value="">Walk-in / guest</option>

                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} ({customer.phone || "no phone"})
                      </option>
                    ))}
                  </Select>
                </Field>

                {/* Order Date */}
                <Field label="Order date">
                  <DateInput
                    value={form.orderDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        orderDate: e.target.value,
                      })
                    }
                  />
                </Field>

                {/* Initial Status */}
                <Field label="Initial status">
                  <Select
                    value={form.orderStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        orderStatus: e.target.value,
                      })
                    }
                  >
                    {ORDER_STATUSES.filter(
                      (status) => !["Returned", "Refunded"].includes(status),
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* Items */}
              <div className="min-w-0 overflow-hidden">
                <ItemsEditor
                  products={products}
                  items={form.items}
                  onChange={(items) =>
                    setForm({
                      ...form,
                      items,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment / Summary */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-5">
              {/* Discount */}
              <Field label="Discount (৳)">
                <Input
                  type="number"
                  min="0"
                  value={form.discount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discount: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Delivery Charge */}
              <Field label="Delivery charge (৳)">
                <Input
                  type="number"
                  min="0"
                  value={form.deliveryCharge}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      deliveryCharge: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Payment Method */}
              <Field label="Payment method">
                <Select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paymentMethod: e.target.value,
                    })
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Advance Paid */}
              <Field label="Advance paid (৳)">
                <Input
                  type="number"
                  min="0"
                  value={form.paidAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paidAmount: e.target.value,
                    })
                  }
                />
              </Field>

              {/* Order Summary */}
              <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60 sm:p-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between gap-4 text-zinc-500">
                  <span>Subtotal</span>

                  <span className="shrink-0">{formatMoney(subtotal)}</span>
                </div>

                {/* Discount */}
                <div className="mt-1 flex items-center justify-between gap-4 text-zinc-500">
                  <span>Discount</span>

                  <span className="shrink-0">-{formatMoney(discount)}</span>
                </div>

                {/* Delivery */}
                <div className="mt-1 flex items-center justify-between gap-4 text-zinc-500">
                  <span>Delivery</span>

                  <span className="shrink-0">
                    +{formatMoney(deliveryCharge)}
                  </span>
                </div>

                {/* Total */}
                <div className="mt-2 flex items-center justify-between gap-4 border-t border-zinc-200 pt-2 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                  <span>Total</span>

                  <span className="shrink-0">{formatMoney(total)}</span>
                </div>

                {/* Due */}
                <div className="mt-2 flex items-center justify-between gap-4 text-xs text-zinc-500">
                  <span>Due on delivery</span>

                  <span className="shrink-0 font-semibold text-amber-600">
                    {formatMoney(total - paid)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <Field label="Notes">
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                  rows={2}
                />
              </Field>

              {/* Submit */}
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
