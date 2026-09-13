"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, Link2Icon, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { ActionButton } from "@/components/ui/DataTable";
import { SearchInput, Field, Select, DateInput, Input } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { PAYMENT_METHODS, PAYMENT_STATUS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function SalesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [collectTarget, setCollectTarget] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE };
    if (search) p.search = search;
    if (paymentStatus) p.paymentStatus = paymentStatus;
    if (paymentMethod) p.paymentMethod = paymentMethod;
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [page, search, paymentStatus, paymentMethod, from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["sales", params],
    queryFn: () => api.get("/sales", { params }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales"
        description={`${pagination.total || 0} sales recorded`}
        actions={
          <Link href="/sales/new">
            <Button><Plus className="size-4" /> New Sale</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput placeholder="Search invoice #…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-52" />
        <Field label="Payment status">
          <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="w-36">
            <option value="">All</option>
            {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Payment method">
          <Select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="w-36">
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
        emptyIcon={ShoppingCart}
        emptyTitle="No sales found"
        emptyDescription="Create your first sale to get started."
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        onRowClick={(s) => router.push(`/sales/${s._id}`)}
        columns={[
          { key: "invoiceNumber", header: "Invoice", render: (s) => <Link href={`/sales/${s._id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">{s.invoiceNumber}</Link> },
          { key: "saleDate", header: "Date", render: (s) => <span className="text-zinc-500">{formatDate(s.saleDate)}</span> },
          { key: "customer", header: "Customer", render: (s) => <span className="text-zinc-700 dark:text-zinc-200">{s.customer?.name || "Walk-in"}</span> },
          { key: "total", header: "Total", align: "right", render: (s) => <span className="font-semibold">{formatMoney(s.total)}</span> },
          { key: "dueAmount", header: "Due", align: "right", render: (s) => <span className={s.dueAmount > 0 ? "font-semibold text-rose-500" : "text-zinc-400"}>{formatMoney(s.dueAmount)}</span> },
          { key: "paymentStatus", header: "Payment", render: (s) => <StatusBadge status={s.paymentStatus} /> },
          {
            key: "actions",
            header: "",
            align: "right",
            className: "w-14",
            render: (s) =>
              s.status !== "cancelled" && s.paymentStatus !== "paid" ? (
                <ActionButton
                  icon={Banknote}
                  label="Mark as paid"
                  tone="success"
                  onClick={() => setCollectTarget(s)}
                />
              ) : (
                <span />
              ),
          },
        ]}
      />

      {collectTarget && (
        <CollectModal
          sale={collectTarget}
          onClose={() => setCollectTarget(null)}
          onDone={() => {
            setCollectTarget(null);
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      )}
    </div>
  );
}

function CollectModal({ sale, onClose, onDone }) {
  const [amount, setAmount] = useState(String(sale.dueAmount || 0));
  const [method, setMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/sales/${sale._id}/payments`, { amount: Number(amount) || 0, method });
      toast.success(`Payment recorded for ${sale.invoiceNumber}`);
      onDone();
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
      title="Collect payment"
      description={`Mark ${sale.invoiceNumber} as paid. Due: ${formatMoney(sale.dueAmount)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Record payment</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount (৳)" required>
          <Input type="number" min="0" max={sale.dueAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}