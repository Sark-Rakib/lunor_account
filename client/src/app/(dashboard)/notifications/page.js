"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, BellRing } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/services/api";
import { useQuery, useMutation } from "@/hooks/queries";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const TYPE_STYLES = {
  "low-stock": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "out-stock": "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  order: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  payment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  due: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  target: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  return: "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
  system: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => api.get("/notifications", { params: { page, limit: PAGE_SIZE } }),
  });

  const items = data?.data || [];
  const pagination = data?.pagination || {};
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const readAllMutation = useMutation({
    method: "put",
    url: "/notifications/read-all",
    onSuccessMessage: "All marked as read",
    success: () => refresh(),
  });

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Everything that needs your attention."
        actions={
          <Button variant="secondary" onClick={() => readAllMutation.mutate()} loading={readAllMutation.isPending}>
            <BellRing className="size-4" /> Mark all read
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-2"><TableSkeleton cols={2} rows={8} /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={Bell} title="All caught up" description="No notifications yet." className="py-14" />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((n) => (
                <li key={n._id} className={cn("group flex gap-3 px-4 py-3.5 transition-colors", !n.read && "bg-indigo-50/60 dark:bg-indigo-500/[0.07]")}>
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase", TYPE_STYLES[n.type] || TYPE_STYLES.system)}>
                    {n.type === "system" ? "SYS" : n.type.split("-")[0].slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {n.title}
                        {!n.read && <span className="ml-2 inline-block size-1.5 rounded-full bg-indigo-500" aria-label="Unread" />}
                      </p>
                      <span className="shrink-0 text-xs text-zinc-400">{dayjs(n.createdAt).format("MMM D, h:mm A")}</span>
                    </div>
                    {n.message && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{n.message}</p>}
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n._id)}
                      className="shrink-0 self-center rounded-md px-2 py-1 text-xs font-medium text-indigo-600 opacity-0 transition-opacity hover:bg-indigo-50 group-hover:opacity-100 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      Mark read
                    </button>
                  )}
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