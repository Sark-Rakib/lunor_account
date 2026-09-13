"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

export default function ItemsEditor({
  products = [],
  items = [],
  onChange,
  priceLabel = "Unit price",
  purchasing = false,
  onLoadProducts,
  onLoadProductsError,
}) {
  const update = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const addRow = () => {
    onChange([...items, { product: "", quantity: 1, size: "", price: "" }]);
  };

  const removeRow = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const totals = items.reduce(
    (acc, it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.price) || 0;
      acc.amount += qty * price;
      return acc;
    },
    { amount: 0 }
  );

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
              <th className="px-3 py-2.5 font-semibold">Product</th>
              <th className="w-20 px-3 py-2.5 font-semibold">Size</th>
              <th className="w-20 px-3 py-2.5 font-semibold">Qty</th>
              <th className="w-32 px-3 py-2.5 font-semibold">{priceLabel}</th>
              <th className="w-32 px-3 py-2.5 text-right font-semibold">Line Total</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-zinc-400">
                  No items yet. Click &quot;Add item&quot; to start.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const product = products.find((p) => p._id === it.product);
                const qty = Number(it.quantity) || 0;
                const price = Number(it.price) || 0;
                return (
                  <tr key={idx} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="px-3 py-2">
                      <Select
                        value={it.product}
                        onChange={(e) => {
                          const id = e.target.value;
                          const p = products.find((x) => x._id === id);
                          update(idx, {
                            product: id,
                            size: "",
                            price: p ? String(purchasing ? p.purchasePrice : p.sellingPrice) : "",
                          });
                        }}
                        className="h-9 text-xs"
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.sku}) {purchasing ? "" : `· stock ${p.currentStock}`}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={it.size || ""}
                        onChange={(e) => update(idx, { size: e.target.value })}
                        className="h-9 text-xs"
                      >
                        <option value="">—</option>
                        {(product?.sizes || []).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => update(idx, { quantity: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.price}
                        onChange={(e) => update(idx, { price: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {formatMoney(qty * price)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeRow(idx)}
                        className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" type="button" onClick={addRow}>
          <Plus className="size-3.5" /> Add item
        </Button>
        {onLoadProductsError && (
          <p className="text-xs text-rose-500">Products failed to load: {onLoadProductsError}</p>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-sm">
          <span className="text-zinc-500">Total:</span>
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">{formatMoney(totals.amount)}</span>
        </div>
      </div>
    </div>
  );
}