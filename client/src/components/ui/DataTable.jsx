"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import EmptyState from "./EmptyState";
import { TableSkeleton } from "./Skeleton";
import Pagination from "./Pagination";

export default function DataTable({
  columns,
  data = [],
  loading = false,
  keyField = "_id",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  page,
  totalPages,
  total,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  className,
  rowClassName,
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
              {columns.map((col) => {
                const canSort = col.sortable !== false && col.key;
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key || col.header}
                    onClick={canSort ? () => onSort?.(col.key) : undefined}
                    className={cn(
                      "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
                      canSort ? "cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200" : "",
                      col.align === "right" ? "text-right" : "",
                      col.className
                    )}
                  >
                    <span className={cn("inline-flex items-center gap-1", col.align === "right" ? "justify-end" : "")}>
                      {col.header}
                      {canSort &&
                        (active ? (
                          sortDir === "asc" ? <ArrowUp className="size-3 text-indigo-500" /> : <ArrowDown className="size-3 text-indigo-500" />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <TableSkeleton rows={5} cols={Math.min(columns.length, 5)} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row?.[keyField] ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-zinc-100 last:border-0 dark:border-zinc-800/70",
                    onRowClick ? "cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40" : "",
                    rowClassName
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key || col.header}
                      className={cn("px-4 py-3 align-middle", col.align === "right" ? "text-right" : "", col.className)}
                    >
                      {typeof col.render === "function" ? col.render(row) : String(row?.[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {page !== undefined && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
      )}
    </div>
  );
}

export function TableActions({ children, className }) {
  return <div className={cn("flex items-center justify-end gap-1", className)}>{children}</div>;
}

export function ActionButton({ icon: Icon, label, onClick, tone = "default", disabled, className }) {
  const tones = {
    default: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
    edit: "text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10",
    danger: "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10",
    success: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  };
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn("rounded-lg p-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed", tones[tone], className)}
    >
      <Icon className="size-4" />
    </button>
  );
}