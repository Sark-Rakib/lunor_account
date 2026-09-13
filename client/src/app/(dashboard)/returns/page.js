"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { SearchInput, Field, Select, DateInput } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { RETURN_REASONS, RETURN_STATUSES } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function ReturnsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [refundStatus, setRefundStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE };
    if (search) p.search = search;
    if (reason) p.reason = reason;
    if (refundStatus) p.refundStatus = refundStatus;
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [page, search, reason, refundStatus, from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["returns", params],
    queryFn: () => api.get("/returns", { params }),
  });

  const items = data?.data || [];
  const meta = data?.meta || {};
  const summary = meta?.summary || {};
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Returns & Refunds"
        description={`${pagination.total || 0} returns · Total refunded: ${formatMoney(summary.total)}`}
        actions={
          <Link href="/returns/new">
            <Button><Plus className="size-4" /> Process Return</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput placeholder="Search return #…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-52" />
        <Field label="Reason">
          <Select value={reason} onChange={(e) => { setReason(e.target.value); setPage(1); }} className="w-44">
            <option value="">All</option>
            {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Refund status">
          <Select value={refundStatus} onChange={(e) => { setRefundStatus(e.target.value); setPage(1); }} className="w-36">
            <option value="">All</option>
            {RETURN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
        emptyIcon={RotateCcw}
        emptyTitle="No returns yet"
        emptyDescription="Process a return for a sale or order."
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        onRowClick={(r) => router.push(`/returns/${r._id}`)}
        columns={[
          { key: "returnNumber", header: "Return", render: (r) => <Link href={`/returns/${r._id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">{r.returnNumber}</Link> },
          { key: "returnDate", header: "Date", render: (r) => <span className="text-zinc-500">{formatDate(r.returnDate)}</span> },
          { key: "source", header: "Source", render: (r) => <span className="text-zinc-600 dark:text-zinc-300">{r.sale?.invoiceNumber || r.order?.orderNumber || "Direct return"}</span> },
          { key: "reason", header: "Reason", render: (r) => <span className="text-zinc-500">{r.reason}</span> },
          { key: "totalRefundAmount", header: "Refund", align: "right", render: (r) => <span className="font-semibold text-rose-500">−{formatMoney(r.totalRefundAmount)}</span> },
          { key: "refundStatus", header: "Status", render: (r) => <StatusBadge status={r.refundStatus} /> },
        ]}
      />
    </div>
  );
}