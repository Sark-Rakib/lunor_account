"use client";

import { cn, todayStr } from "@/lib/utils";
import { DateInput } from "@/components/ui/Form";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

export default function PeriodSelector({ value = "month", onChange, custom, className }) {
  const active = custom ? "custom" : value;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange({ preset: p.value, custom: null })}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              active === p.value
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {custom && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 p-0.5 dark:border-indigo-500/30">
          <DateInput
            value={custom.from || ""}
            onChange={(e) => onChange({ preset: null, custom: { ...custom, from: e.target.value } })}
            className="h-8 border-0 bg-transparent text-xs"
          />
          <span className="text-xs text-zinc-400">→</span>
          <DateInput
            value={custom.to || ""}
            onChange={(e) => onChange({ preset: null, custom: { ...custom, to: e.target.value } })}
            className="h-8 border-0 bg-transparent text-xs"
          />
        </div>
      )}
      {!custom && (
        <button
          onClick={() => {
            const today = new Date();
            onChange({
              preset: null,
              custom: { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, to: todayStr() },
            });
          }}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Custom
        </button>
      )}
    </div>
  );
}