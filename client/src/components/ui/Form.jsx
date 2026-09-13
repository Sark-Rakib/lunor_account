import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export function Input({ className, invalid, ...props }) {
  return (
    <input
      className={cn(
        base,
        "h-10",
        invalid ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "border-zinc-300 dark:border-zinc-700",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }) {
  return (
    <textarea
      className={cn(
        base,
        "min-h-20 py-2",
        invalid ? "border-rose-400" : "border-zinc-300 dark:border-zinc-700",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, invalid, children, ...props }) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          base,
          "h-10 appearance-none pr-8 cursor-pointer",
          invalid ? "border-rose-400" : "border-zinc-300 dark:border-zinc-700"
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

export function Label({ className, children, ...props }) {
  return (
    <label className={cn("mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300", className)} {...props}>
      {children}
    </label>
  );
}

export function Field({ label, error, children, required, className, hint }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

export function SearchInput({ className, ...props }) {
  return (
    <div className={cn("relative", className)}>
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
      </svg>
      <input className={cn(base, "h-10 pl-8 border-zinc-300 dark:border-zinc-700")} {...props} />
    </div>
  );
}

export function DateInput({ className, ...props }) {
  return <input type="date" className={cn(base, "h-10 border-zinc-300 dark:border-zinc-700", className)} {...props} />;
}