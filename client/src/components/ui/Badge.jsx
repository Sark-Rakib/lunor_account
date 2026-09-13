import { cn } from "@/lib/utils";

const tones = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  blue: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  slate: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
};

export default function Badge({ tone = "slate", className, dot, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("size-1.5 rounded-full", tones[tone].split(" ")[0].includes("bg-") ? "bg-current" : "")} />}
      {children}
    </span>
  );
}

export const badgeToneForStatus = (status = "") => {
  const s = String(status).toLowerCase();
  if (["paid", "completed", "delivered", "refunded", "processed", "active", "good", "income", "profit"].includes(s)) return "emerald";
  if (["pending", "partial", "processing", "shipped"].includes(s)) return "amber";
  if (["cancelled", "refunded_total", "damaged", "expense", "loss"].includes(s)) return "red";
  if (["confirmed", "resolved"].includes(s)) return "blue";
  if (["returned"].includes(s)) return "violet";
  return "slate";
};

export function StatusBadge({ status, className, ...props }) {
  return (
    <Badge tone={badgeToneForStatus(status)} className={className} {...props}>
      {String(status || "—").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  );
}