"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { ActionButton, TableActions } from "@/components/ui/DataTable";
import { SearchInput, Field, Input, Textarea } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatMoney, getInitialsColor, initials } from "@/lib/utils";
import { ContactPaymentModal, DeleteContactDialog } from "../customers/page";

const PAGE_SIZE = 20;

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE };
    if (search) p.search = search;
    return p;
  }, [page, search]);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => api.get("/suppliers", { params }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["suppliers"] });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description={`${pagination.total || 0} suppliers`}
        actions={<Button onClick={() => setModal({ mode: "create" })}><Plus className="size-4" /> Add Supplier</Button>}
      />

      <SearchInput placeholder="Search by name, company or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-72" />

      <DataTable
        loading={isLoading}
        data={items}
        keyField="_id"
        emptyIcon={Store}
        emptyTitle="No suppliers found"
        emptyDescription="Add suppliers you purchase stock from."
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        columns={[
          {
            key: "name",
            header: "Supplier",
            render: (c) => (
              <div className="flex items-center gap-3">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getInitialsColor(c.name)}`}>{initials(c.name)}</div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-800 dark:text-zinc-100">{c.name}</p>
                  <p className="truncate text-xs text-zinc-400">{c.company || c.phone || "—"}</p>
                </div>
              </div>
            ),
          },
          { key: "totalPurchase", header: "Purchases", align: "right", render: (c) => <span className="text-zinc-700 dark:text-zinc-200">{formatMoney(c.totalPurchase)}</span> },
          { key: "totalDue", header: "Due", align: "right", render: (c) => <span className={c.totalDue > 0 ? "font-semibold text-rose-500" : "text-zinc-400"}>{formatMoney(c.totalDue)}</span> },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (c) => (
              <TableActions>
                <ActionButton icon={Banknote} label="Make payment" tone="success" disabled={!c.totalDue || c.totalDue <= 0} onClick={() => setPayTarget(c)} />
                <ActionButton icon={Pencil} label="Edit" tone="edit" onClick={() => setModal({ mode: "edit", supplier: c })} />
                <ActionButton icon={Trash2} label="Delete" tone="danger" disabled={c.totalPurchase > 0} onClick={() => setDeleteTarget(c)} />
              </TableActions>
            ),
          },
        ]}
      />

      {modal && <SupplierFormModal mode={modal.mode} supplier={modal.supplier} onClose={() => setModal(null)} onSaved={() => { refresh(); setModal(null); }} />}
      {payTarget && <ContactPaymentModal kind="supplier" contact={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); refresh(); }} />}
      {deleteTarget && <DeleteContactDialog kind="supplier" contact={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={() => { setDeleteTarget(null); refresh(); }} />}
    </div>
  );
}

function SupplierFormModal({ mode, supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: supplier?.name || "",
    company: supplier?.company || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    address: supplier?.address || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === "edit") await api.put(`/suppliers/${supplier._id}`, form);
      else await api.post("/suppliers", form);
      toast.success(mode === "edit" ? "Supplier updated" : "Supplier added");
      onSaved();
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
      title={mode === "edit" ? "Edit supplier" : "Add supplier"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{mode === "edit" ? "Save changes" : "Add supplier"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Supplier name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Company">
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
        </Field>
      </div>
    </Modal>
  );
}