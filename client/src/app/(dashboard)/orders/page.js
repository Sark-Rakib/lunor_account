"use client";

import { useMemo, useState } from "react";
import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { SearchInput, DateInput, Field, Select } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = useMemo(() => {
    const p = { page, limit: PAGE_SIZE };
    if (search) p.search = search;
    if (orderStatus) p.orderStatus = orderStatus;
    if (paymentStatus) p.paymentStatus = paymentStatus;
    if (paymentMethod) p.paymentMethod = paymentMethod;
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [page, search, orderStatus, paymentStatus, paymentMethod, from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", params],
    queryFn: () => api.get("/orders", { params }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description={`${pagination.total || 0} customer orders`}
        actions={
          <Link href="/orders/new">
            <Button><Plus className="size-4" /> New Order</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput placeholder="Search order #…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-52" />
        <Field label="Status">
          <Select value={orderStatus} onChange={(e) => { setOrderStatus(e.target.value); setPage(1); }} className="w-36">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
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
        emptyIcon={Package}
        emptyTitle="No orders found"
        emptyDescription="Create your first customer order to start."
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
        onRowClick={(o) => router.push(`/orders/${o._id}`)}
        columns={[
          { key: "orderNumber", header: "Order", render: (o) => <Link href={`/orders/${o._id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">{o.orderNumber}</Link> },
          { key: "orderDate", header: "Date", render: (o) => <span className="text-zinc-500">{formatDate(o.orderDate)}</span> },
          { key: "customer", header: "Customer", render: (o) => <span className="text-zinc-700 dark:text-zinc-200">{o.customerName || o.customer?.name || "Walk-in"}</span> },
          { key: "total", header: "Total", align: "right", render: (o) => <span className="font-semibold">{formatMoney(o.total)}</span> },
          { key: "dueAmount", header: "Due", align: "right", render: (o) => <span className={o.dueAmount > 0 ? "font-semibold text-rose-500" : "text-zinc-400"}>{formatMoney(o.dueAmount)}</span> },
          { key: "orderStatus", header: "Order status", render: (o) => <StatusBadge status={o.orderStatus} /> },
          { key: "paymentStatus", header: "Payment", render: (o) => <StatusBadge status={o.paymentStatus} /> },
        ]}
      />
    </div>
  );
}