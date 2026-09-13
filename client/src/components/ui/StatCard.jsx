import { TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

export default function StatCard({ title, value, icon: Icon, iconClass = "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400", trend, subtitle, loading, className }) {
  if (loading) {
    return (
      <div className={cn("rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:p-5", className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </div>
    );
  }

  const trendUp = Number(trend) >= 0;
  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-500">{title}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
            {formatCompact(value)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {trend !== undefined && (
              <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", trendUp ? "text-emerald-600" : "text-rose-500")}>
                {trendUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {Math.abs(Number(trend)).toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="truncate text-xs text-zinc-400">{subtitle}</span>}
          </div>
        </div>
        {Icon && (
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", iconClass)}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
    </div>
  );
}