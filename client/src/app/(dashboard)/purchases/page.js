"use client";

import { useMemo, useState } from "react";
import { Truck, Plus } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { SearchInput, DateInput, Field, Select } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PAYMENT_METHODS, PAYMENT_STATUS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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
    queryKey: ["purchases", params],
    queryFn: () => api.get("/purchases", { params }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchases"
        description={`${pagination.total || 0} stock purchases`}
        actions={
          <Link href="/purchases/new">
            <Button><Plus className="size-4" /> New Purchase</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput placeholder="Search purchase #…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-52" />
        <Field label="Payment">
          <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="w-32">
            <option value="">All</option>
            {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Method">
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
        emptyIcon={Truck}
        emptyTitle="No purchases found"
        emptyDescription="Record a purchase to restock your inventory."
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        columns={[
          { key: "purchaseNumber", header: "Purchase", render: (p) => <Link href={`/purchases/${p._id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">{p.purchaseNumber}</Link> },
          { key: "purchaseDate", header: "Date", render: (p) => <span className="text-zinc-500">{formatDate(p.purchaseDate)}</span> },
          { key: "supplier", header: "Supplier", render: (p) => <span className="text-zinc-700 dark:text-zinc-200">{p.supplier?.name || "—"}</span> },
          { key: "itemCount", header: "Items", render: (p) => <span className="text-zinc-500">{p.items?.length ?? 0}</span> },
          { key: "totalAmount", header: "Total", align: "right", render: (p) => <span className="font-semibold">{formatMoney(p.totalAmount)}</span> },
          { key: "dueAmount", header: "Due", align: "right", render: (p) => <span className={p.dueAmount > 0 ? "font-semibold text-rose-500" : "text-zinc-400"}>{formatMoney(p.dueAmount)}</span> },
          { key: "paymentStatus", header: "Payment", render: (p) => <StatusBadge status={p.paymentStatus} /> },
        ]}
      />
    </div>
  );
}