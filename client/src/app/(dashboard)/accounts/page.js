"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery, useMutation } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { ActionButton, TableActions } from "@/components/ui/DataTable";
import { Field, Input, Select } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get("/accounts"),
  });

  const accounts = data?.accounts || [];
  const totalBalance = data?.totalBalance || 0;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["accounts", "cash-flow"] });

  const items = useMemo(() => {
    const list = data?.accounts || [];
    return type ? list.filter((a) => a.type === type) : list;
  }, [data, type]);

  const { data: flowData } = useQuery({
    queryKey: ["cash-flow", { period: "month" }],
    queryFn: () => api.get("/accounts/flow/cash-flow", { params: { period: "month" } }),
  });
  const flow = flowData?.flow || {};

  return (
    <div className="space-y-4">
      <PageHeader
        title="Accounts & Payments"
        description="Your cash, mobile wallets and bank accounts."
        actions={<Button onClick={() => setModal({ mode: "create" })}><Plus className="size-4" /> Add Account</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label="Total balance" value={totalBalance} tone="emerald" />
        <SummaryTile label="Money in (this month)" value={flow.cashIn} tone="indigo" />
        <SummaryTile label="Money out (this month)" value={flow.cashOut} tone="rose" />
      </div>

      <Field label="Account type" className="w-44">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>

      <DataTable
        loading={isLoading}
        data={items}
        keyField="_id"
        emptyIcon={Wallet}
        emptyTitle={isLoading ? "Loading accounts…" : "No accounts yet"}
        columns={[
          {
            key: "name",
            header: "Account",
            render: (a) => (
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-100">{a.name} {a.isDefault && <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">DEFAULT</span>}</p>
                <p className="text-xs text-zinc-400">{a.type} · opened {formatMoney(a.openingBalance)}</p>
              </div>
            ),
          },
          { key: "type", header: "Type", render: (a) => <span className="text-zinc-500">{a.type}</span> },
          {
            key: "currentBalance",
            header: "Balance",
            align: "right",
            render: (a) => <span className={`font-bold ${a.currentBalance < 0 ? "text-rose-500" : "text-emerald-600"}`}>{formatMoney(a.currentBalance)}</span>,
          },
          {
            key: "actions",
            header: "",
            align: "right",
            render: (a) => (
              <TableActions>
                <ActionButton icon={Pencil} label="Edit" tone="edit" onClick={() => setModal({ mode: "edit", account: a })} />
                <ActionButton icon={Trash2} label="Delete" tone="danger" disabled={a.isDefault} onClick={() => setDeleteTarget(a)} />
              </TableActions>
            ),
          },
        ]}
      />

      {modal && <AccountModal mode={modal.mode} account={modal.account} onClose={() => setModal(null)} onSaved={() => { refresh(); setModal(null); }} />}
      {deleteTarget && <DeleteAccountDialog account={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={() => { setDeleteTarget(null); refresh(); }} />}
    </div>
  );
}

function SummaryTile({ label, value, tone }) {
  const tones = {
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
    rose: "text-rose-500",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1.5 text-xl font-bold ${tones[tone]}`}>{formatMoney(value ?? 0)}</p>
    </div>
  );
}

function AccountModal({ mode, account, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: account?.name || "",
    type: account?.type || "Cash",
    openingBalance: account?.openingBalance || "",
    note: account?.note || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === "edit") {
        const payload = { name: form.name, type: form.type, note: form.note };
        await api.put(`/accounts/${account._id}`, payload);
      } else {
        await api.post("/accounts", { ...form, openingBalance: Number(form.openingBalance) || 0 });
      }
      toast.success(mode === "edit" ? "Account updated" : "Account created");
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
      title={mode === "edit" ? "Edit account" : "Add account"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{mode === "edit" ? "Save changes" : "Create account"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Cash" />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Opening balance (৳)" hint={mode === "edit" ? "Use note instead — adjustments go through payments." : ""}>
          <Input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
        </Field>
        <Field label="Note">
          <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function DeleteAccountDialog({ account, onClose, onDone }) {
  const mutation = useMutation({
    method: "delete",
    url: `/accounts/${account._id}`,
    success: () => {
      toast.success("Account deactivated");
      onDone();
    },
  });
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => mutation.mutate()}
      loading={mutation.isPending}
      title="Deactivate this account?"
      description={`${account.name} can be deactivated unless it is the default account. Accounts with past transactions cannot be permanently deleted.`}
    />
  );
}