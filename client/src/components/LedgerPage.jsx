"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useList, useMutation } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { ActionButton, TableActions } from "@/components/ui/DataTable";
import { SearchInput, Field, Input, Select, DateInput, Textarea } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAccounts } from "@/hooks/useOptions";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatDate, formatMoney, todayStr } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function LedgerPage({
  kind = "expense",
  title,
  description,
  emptyIcon,
  categories,
  dateLabel = "Date",
  detailsLabel = "Description",
}) {
  const queryClient = useQueryClient();
  const isExpense = kind === "expense";
  const endpoint = isExpense ? "expenses" : "incomes";
  const dateField = isExpense ? "expenseDate" : "incomeDate";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE };
    if (search) p.search = search;
    if (category) p.category = category;
    if (method) p.paymentMethod = method;
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [page, search, category, method, from, to]);

  const { data, isLoading } = useList({ key: endpoint, url: `/${endpoint}`, params });
  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const refresh = () => queryClient.invalidateQueries({ queryKey: [endpoint] });

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        actions={<Button onClick={() => setModal({ mode: "create" })}><Plus className="size-4" /> Add {isExpense ? "Expense" : "Income"}</Button>}
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput placeholder={`Search ${isExpense ? "expense title…" : "income title…"}`} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />
        <Field label="Category">
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-44">
            <option value="">All</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} className="w-32">
            <option value="">All</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="From">
          <DateInput value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-36" />
        </Field>
        <Field label="To">
          <DateInput value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-36" />
        </Field>
      </div>

      <DataTable
        loading={isLoading}
        data={items}
        keyField="_id"
        emptyIcon={emptyIcon}
        emptyTitle={`No ${isExpense ? "expenses" : "income"} found`}
        emptyDescription={`Record your first ${isExpense ? "expense" : "income entry"} to see it here.`}
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        columns={[
          {
            key: "title",
            header: isExpense ? "Expense" : "Income",
            render: (r) => (
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-100">{r.title}</p>
                <p className="text-xs text-zinc-400">{r.category}</p>
              </div>
            ),
          },
          { key: dateField, header: dateLabel, render: (r) => <span className="text-zinc-500">{formatDate(r[dateField])}</span> },
          { key: "paymentMethod", header: "Method", render: (r) => <span className="text-zinc-500">{r.paymentMethod}</span> },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            render: (r) => (
              <span className={`font-semibold ${isExpense ? "text-rose-500" : "text-emerald-600"}`}>
                {isExpense ? "−" : "+"}{formatMoney(r.amount)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (r) => (
              <TableActions>
                <ActionButton icon={Pencil} label="Edit" tone="edit" onClick={() => setModal({ mode: "edit", record: r })} />
                <ActionButton icon={Trash2} label="Delete" tone="danger" onClick={() => setDeleteTarget(r)} />
              </TableActions>
            ),
          },
        ]}
      />

      {modal && (
        <RecordModal
          kind={kind}
          mode={modal.mode}
          record={modal.record}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { refresh(); setModal(null); }}
        />
      )}
      {deleteTarget && <DeleteRecordDialog kind={kind} record={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={() => { setDeleteTarget(null); refresh(); }} />}
    </div>
  );
}

function RecordModal({ kind, mode, record, categories, onClose, onSaved }) {
  const isExpense = kind === "expense";
  const endpoint = isExpense ? "expenses" : "incomes";
  const dateField = isExpense ? "expenseDate" : "incomeDate";
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.data || [];
  const [form, setForm] = useState({
    title: record?.title || "",
    category: record?.category || categories[0],
    amount: record?.amount || "",
    paymentMethod: record?.paymentMethod || "Cash",
    account: record?.account?._id || record?.account || "",
    [dateField]: record?.[dateField] || todayStr(),
    description: record?.description || record?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        account: form.account || null,
        media: undefined,
      };
      delete payload.media;
      if (mode === "edit") await api.put(`/${endpoint}/${record._id}`, payload);
      else await api.post(`/${endpoint}`, payload);
      toast.success(mode === "edit" ? (isExpense ? "Expense updated" : "Income updated") : isExpense ? "Expense added" : "Income added");
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
      title={mode === "edit" ? (isExpense ? "Edit expense" : "Edit income") : isExpense ? "Add expense" : "Add income"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{mode === "edit" ? "Save changes" : "Save"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={isExpense ? "e.g. Packaging materials" : "e.g. Design service income"} />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Amount (৳)" required>
          <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Payment method">
          <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Account">
          <Select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            <option value="">Default</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.type})</option>)}
          </Select>
        </Field>
        <Field label="Date">
          <DateInput value={form[dateField]} onChange={(e) => setForm({ ...form, [dateField]: e.target.value })} />
        </Field>
        <Field label={isExpense ? "Description" : "Notes"} className="sm:col-span-2">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        </Field>
      </div>
    </Modal>
  );
}

function DeleteRecordDialog({ kind, record, onClose, onDone }) {
  const isExpense = kind === "expense";
  const endpoint = isExpense ? "expenses" : "incomes";
  const mutation = useMutation({
    method: "delete",
    url: `/${endpoint}/${record._id}`,
    success: () => {
      toast.success(isExpense ? "Expense deleted" : "Income deleted");
      onDone();
    },
  });
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      loading={mutation.isPending}
      title={isExpense ? "Delete this expense?" : "Delete this income?"}
      description={`"${record.title}" (${formatMoney(record.amount)}) will be permanently removed.`}
    />
  );
}