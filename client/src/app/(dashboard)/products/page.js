"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery, useMutation } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { ActionButton, TableActions } from "@/components/ui/DataTable";
import { Field, Input, Select, SearchInput } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/Badge";
import { PRODUCT_CATEGORIES, PRODUCT_STATUS, SIZES, PANT_SIZES } from "@/lib/constants";
import { cn, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [stock, setStock] = useState("");
  const [productModal, setProductModal] = useState(null); // {mode: 'create'|'edit', product}
  const [stockModal, setStockModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE };
    if (search) p.search = search;
    if (category) p.category = category;
    if (status) p.status = status;
    if (stock === "low") p.minStock = true;
    if (stock === "out") p.stockOnly = true;
    return p;
  }, [page, search, category, status, stock]);

  const { data, isLoading } = useQuery({
    queryKey: ["products", params],
    queryFn: () => api.get("/products", { params }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleResult = (message) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setProductModal(null);
    setStockModal(null);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description={`${pagination.total || 0} products in your catalog`}
        actions={
          <Button onClick={() => setProductModal({ mode: "create" })}>
            <Plus className="size-4" /> New Product
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput placeholder="Search by name or SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />
        <Field label="Category">
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-40">
            <option value="">All</option>
            {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-32">
            <option value="">All</option>
            {PRODUCT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Stock">
          <Select value={stock} onChange={(e) => { setStock(e.target.value); setPage(1); }} className="w-32">
            <option value="">All</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock</option>
          </Select>
        </Field>
      </div>

      <DataTable
        loading={isLoading}
        data={items}
        keyField="_id"
        emptyIcon={Shirt}
        emptyTitle="No products found"
        emptyDescription="Add your first product to start selling."
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        columns={[
          {
            key: "name",
            header: "Product",
            render: (p) => (
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-100">{p.name}</p>
                <p className="text-xs text-zinc-400">{p.sku} · size {p.sizes?.length ? p.sizes.join("/") : "—"}</p>
              </div>
            ),
          },
          { key: "category", header: "Category", render: (p) => <span className="text-zinc-500">{p.category}</span> },
          {
            key: "currentStock",
            header: "Stock",
            render: (p) => (
              <span className={cn("font-semibold", p.currentStock <= 0 ? "text-rose-500" : p.currentStock <= (p.minimumStock || 0) ? "text-amber-600" : "text-emerald-600")}>
                {p.currentStock}
                <span className="ml-1 font-normal text-zinc-400">/ min {p.minimumStock || 0}</span>
              </span>
            ),
          },
          { key: "purchasePrice", header: "Cost", align: "right", render: (p) => <span className="text-zinc-600 dark:text-zinc-300">{formatMoney(p.purchasePrice)}</span> },
          { key: "sellingPrice", header: "Price", align: "right", render: (p) => <span className="font-semibold text-zinc-800 dark:text-zinc-100">{formatMoney(p.sellingPrice)}</span> },
          { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (p) => (
              <TableActions>
                <ActionButton icon={Plus} label="Adjust stock" tone="edit" onClick={() => setStockModal(p)} />
                <ActionButton icon={Pencil} label="Edit" tone="edit" onClick={() => setProductModal({ mode: "edit", product: p })} />
                <ActionButton icon={Trash2} label={p.soldQuantity || p.purchasedQuantity ? "Archive" : "Delete"} tone="danger" onClick={() => setDeleteTarget(p)} />
              </TableActions>
            ),
          },
        ]}
      />

      {productModal && (
        <ProductFormModal
          mode={productModal.mode}
          product={productModal.product}
          onClose={() => setProductModal(null)}
          onSaved={(msg) => handleResult(msg)}
        />
      )}

      {stockModal && (
        <StockAdjustModal product={stockModal} onClose={() => setStockModal(null)} onSaved={handleResult} />
      )}

      {deleteTarget && (
        <DeleteProductDialog product={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={handleResult} />
      )}
    </div>
  );
}

function ProductFormModal({ mode, product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category: product?.category || "Casual Shirt",
    sizes: product?.sizes?.join(",") || "",
    purchasePrice: product?.purchasePrice || "",
    sellingPrice: product?.sellingPrice || "",
    minimumStock: product?.minimumStock ?? 5,
    description: product?.description || "",
    status: product?.status || "active",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        sizes: form.sizes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        minimumStock: Number(form.minimumStock) || 0,
      };
      if (mode === "edit") {
        await api.put(`/products/${product._id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      onSaved(mode === "edit" ? "Product updated" : "Product created");
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
      title={mode === "edit" ? "Edit product" : "New product"}
      description="Product information, pricing and stock limits."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{mode === "edit" ? "Save changes" : "Create product"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product name" required className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lunor Oversized Shirt" />
        </Field>
        <Field label="SKU" required>
          <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="LUN-SH-001" />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Sizes (comma separated)">
          <Input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S, M, L, XL" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PRODUCT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Purchase price (৳)">
          <Input type="number" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
        </Field>
        <Field label="Selling price (৳)" required>
          <Input type="number" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
        </Field>
        <Field label="Minimum stock level">
          <Input type="number" min="0" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes about this product" />
        </Field>
      </div>
    </Modal>
  );
}

function StockAdjustModal({ product, onClose, onSaved }) {
  const [type, setType] = useState("manual-increase");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.put(`/products/${product._id}/stock`, { type, quantity: Number(quantity), reason });
      onSaved("Stock adjusted");
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
      title={`Adjust stock — ${product.name}`}
      description={`Current stock: ${product.currentStock} · SKU ${product.sku}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="manual-increase">Manual increase</option>
            <option value="manual-decrease">Manual decrease</option>
            <option value="damage">Damage</option>
            <option value="adjustment">Adjustment</option>
          </Select>
        </Field>
        <Field label="Quantity" required>
          <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="How many?" />
        </Field>
        <Field label="Reason" className="sm:col-span-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. found torn stock" />
        </Field>
      </div>
    </Modal>
  );
}

function DeleteProductDialog({ product, onClose, onDone }) {
  const mutation = useMutation({
    method: "delete",
    url: `/products/${product._id}`,
    onSuccessMessage: product.soldQuantity || product.purchasedQuantity ? "Product archived" : "Product deleted",
    success: () => onDone(),
  });

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      loading={mutation.isPending}
      title={product.soldQuantity || product.purchasedQuantity ? "Archive this product?" : "Delete this product?"}
      description={
        product.soldQuantity || product.purchasedQuantity
          ? `${product.name} has transaction history, so it will be archived instead of deleted. It stays visible in reports but can no longer be sold.`
          : `Are you sure you want to delete ${product.name}? This cannot be undone.`
      }
      confirmText="Yes, continue"
    />
  );
}