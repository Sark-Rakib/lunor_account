import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Pagination({ page, totalPages, onPageChange, total, className }) {
  if (totalPages <= 1 && (total || 0) === 0) return null;
  const pageNumbers = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800", className)}>
      <p className="text-xs text-zinc-500">
        Showing <span className="font-medium text-zinc-700 dark:text-zinc-200">{total || 0}</span> records
        {totalPages > 1 && <> · page {page} of {totalPages}</>}
      </p>
      <div className="flex items-center gap-1">
        <button aria-label="First page" disabled={page <= 1} onClick={() => onPageChange(1)} className={cn(btn, "text-zinc-400")}>
          <ChevronsLeft className="size-4" />
        </button>
        <button aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={cn(btn, "text-zinc-400")}>
          <ChevronLeft className="size-4" />
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              btn,
              p === page
                ? "bg-indigo-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            {p}
          </button>
        ))}
        <button aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={cn(btn, "text-zinc-400")}>
          <ChevronRight className="size-4" />
        </button>
        <button aria-label="Last page" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} className={cn(btn, "text-zinc-400")}>
          <ChevronsRight className="size-4" />
        </button>
      </div>
    </div>
  );
}