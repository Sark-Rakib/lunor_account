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
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatMoney, todayStr } from "@/lib/utils";

export default function NewSalePage() {
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
    customerName: "",
    items: [],
    discount: 0,
    deliveryCharge: 0,
    paymentMethod: "Cash",
    paymentStatus: "paid",
    paidAmount: 0,
    saleDate: todayStr(),
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

  const prevPaid = Number(form.paidAmount) || 0;

  const adjustPaid = (value) => {
    let paid = Number(value) || 0;

    if (paid > total) {
      paid = total;
    }

    setForm({
      ...form,
      paidAmount: paid,
      paymentStatus: paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid",
    });
  };

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
        paidAmount: Number(form.paidAmount) || 0,
        customerName: form.customerName,
        saleDate: form.saleDate,
        notes: form.notes,
      };

      const res = await api.post("/sales", payload);

      toast.success("Sale created");

      router.push(`/sales/${res.sale?._id}`);
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
        title="New Sale"
        description="Record a point-of-sale or credit sale."
        actions={
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-100"
          >
            <ChevronLeft className="size-4" />
            <span>Back to sales</span>
          </Link>
        }
      />

      {/* Main Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left / Main Section */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-5">
              {/* Customer + Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Customer */}
                <Field label="Customer">
                  <div className="space-y-2">
                    <Select
                      value={form.customer}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customer: e.target.value,
                          customerName: "",
                        })
                      }
                    >
                      <option value="">Walk-in customer</option>

                      {customers.map((customer) => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name} ({customer.phone || "no phone"})
                        </option>
                      ))}
                    </Select>

                    <Input
                      placeholder="…or type a customer name"
                      value={form.customerName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customerName: e.target.value,
                          customer: "",
                        })
                      }
                    />
                  </div>
                </Field>

                {/* Sale Date */}
                <Field label="Sale date">
                  <DateInput
                    value={form.saleDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        saleDate: e.target.value,
                      })
                    }
                  />
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

        {/* Right / Payment Section */}
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

              {/* Amount Paid */}
              <Field label="Amount paid (৳)">
                <Input
                  type="number"
                  min="0"
                  value={form.paidAmount}
                  onChange={(e) => adjustPaid(e.target.value)}
                />
              </Field>

              {/* Summary */}
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
                  <span>Due</span>

                  <span className="shrink-0 font-semibold text-rose-500">
                    {formatMoney(Math.max(0, total - prevPaid))}
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
                {saving ? "Creating…" : "Create sale"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
