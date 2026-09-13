"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { Activity as ActivityIcon, Search } from "lucide-react";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Form";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const ACTIONS = ["created", "updated", "deleted", "cancelled", "payment", "status", "adjusted"];

const ACTION_STYLES = {
  created: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  updated: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  deleted: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  cancelled: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  payment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  status: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  adjusted: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({});

  const { data, isPending } = useQuery({
    queryKey: ["activity", page, action, query],
    queryFn: () =>
      api.get("/activity", {
        params: { page, limit: PAGE_SIZE, ...(action ? { action } : {}), ...(query.search ? { search: query.search } : {}) },
      }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity Log"
        description="Audit trail of everything happening in your business."
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              placeholder="Search description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setQuery({ search }); setPage(1); }
              }}
            />
          </div>
        </Field>
        <Field label="Action" className="w-44">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </Field>
        <Button variant="secondary" onClick={() => { setQuery({}); setSearch(""); setPage(1); }}>Reset</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <div className="p-2"><TableSkeleton cols={3} rows={8} /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={ActivityIcon} title="No activity" description="Nothing logged here yet." className="py-14" />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((a) => (
                <li key={a._id} className="flex items-start gap-3 px-4 py-3">
                  <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", ACTION_STYLES[a.action] || "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300")}>
                    {a.action}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{a.description}</p>
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-500 dark:text-zinc-300">{a.user?.name || "System"}</span> · {a.entity} · {dayjs(a.createdAt).format("D MMM YYYY, h:mm A")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}