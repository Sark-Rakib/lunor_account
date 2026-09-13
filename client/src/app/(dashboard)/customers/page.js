"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery, useMutation } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { ActionButton, TableActions } from "@/components/ui/DataTable";
import { SearchInput, Field, Input, Select, DateInput, Textarea } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatDate, formatMoney, getInitialsColor, initials, todayStr } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {mode, customer}
  const [payTarget, setPayTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE, sort: "due" };
    if (search) p.search = search;
    return p;
  }, [page, search]);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", params],
    queryFn: () => api.get("/customers", { params }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["customers"] });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description={`${pagination.total || 0} customers`}
        actions={<Button onClick={() => setModal({ mode: "create" })}><Plus className="size-4" /> Add Customer</Button>}
      />

      <SearchInput placeholder="Search by name, phone or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-72" />

      <DataTable
        loading={isLoading}
        data={items}
        keyField="_id"
        emptyIcon={Users}
        emptyTitle="No customers found"
        emptyDescription="Add your first customer to start tracking payments."
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        columns={[
          {
            key: "name",
            header: "Customer",
            render: (c) => (
              <div className="flex items-center gap-3">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getInitialsColor(c.name)}`}>{initials(c.name)}</div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-800 dark:text-zinc-100">{c.name}</p>
                  <p className="truncate text-xs text-zinc-400">{c.phone || c.email || "—"}</p>
                </div>
              </div>
            ),
          },
          { key: "totalOrders", header: "Orders", render: (c) => <span className="text-zinc-500">{c.totalOrders}</span> },
          { key: "totalPurchased", header: "Purchased", align: "right", render: (c) => <span className="text-zinc-700 dark:text-zinc-200">{formatMoney(c.totalPurchased)}</span> },
          { key: "totalDue", header: "Due", align: "right", render: (c) => <span className={c.totalDue > 0 ? "font-semibold text-rose-500" : "text-zinc-400"}>{formatMoney(c.totalDue)}</span> },
          { key: "lastOrder", header: "Last order", render: (c) => <span className="text-zinc-500">{c.lastOrder ? formatDate(c.lastOrder) : "—"}</span> },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (c) => (
              <TableActions>
                <ActionButton icon={Banknote} label="Record payment" tone="success" disabled={!c.totalDue || c.totalDue <= 0} onClick={() => setPayTarget(c)} />
                <ActionButton icon={Pencil} label="Edit" tone="edit" onClick={() => setModal({ mode: "edit", customer: c })} />
                <ActionButton icon={Trash2} label="Delete" tone="danger" disabled={c.totalOrders > 0} onClick={() => setDeleteTarget(c)} />
              </TableActions>
            ),
          },
        ]}
      />

      {modal && <CustomerFormModal mode={modal.mode} customer={modal.customer} onClose={() => setModal(null)} onSaved={() => { refresh(); setModal(null); }} />}
      {payTarget && <ContactPaymentModal kind="customer" contact={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); refresh(); }} />}
      {deleteTarget && (
        <DeleteContactDialog kind="customer" contact={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={() => { setDeleteTarget(null); refresh(); }} />
      )}
    </div>
  );
}

function CustomerFormModal({ mode, customer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    address: customer?.address || "",
    notes: customer?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === "edit") await api.put(`/customers/${customer._id}`, form);
      else await api.post("/customers", form);
      toast.success(mode === "edit" ? "Customer updated" : "Customer added");
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
      title={mode === "edit" ? "Edit customer" : "Add customer"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{mode === "edit" ? "Save changes" : "Add customer"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </Field>
      </div>
    </Modal>
  );
}

export { ContactPaymentModal, DeleteContactDialog };

function DeleteContactDialog({ kind, contact, onClose, onDone }) {
  const url = kind === "customer" ? `/customers/${contact._id}` : `/suppliers/${contact._id}`;
  const mutation = useMutation({
    method: "delete",
    url,
    success: () => {
      toast.success(kind === "customer" ? "Customer deleted" : "Supplier deleted");
      onDone();
    },
  });
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      loading={mutation.isPending}
      title={`Delete ${kind}?`}
      description={`${contact.name} has no transaction history, so it can be removed permanently.`}
    />
  );
}

function ContactPaymentModal({ kind, contact, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!Number(amount) || Number(amount) <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      const url = kind === "customer" ? `/customers/${contact._id}/payments` : `/suppliers/${contact._id}/payments`;
      await api.post(url, { amount: Number(amount), method, date, note });
      toast.success("Payment recorded");
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const due = kind === "customer" ? contact.totalDue : contact.totalDue;
  return (
    <Modal
      open
      onClose={onClose}
      title={kind === "customer" ? "Receive payment" : "Make payment"}
      description={`${kind === "customer" ? "From" : "To"} ${contact.name} · Current due: ${formatMoney(due)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Record payment</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount (৳)" required>
          <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Date">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}