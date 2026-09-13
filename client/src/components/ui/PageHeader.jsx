import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "./Button";

export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn(className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
          {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Rule({ className }) {
  return <div className={cn("my-4 h-px bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export function FilterBar({ children, className, onFiltersReset }) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {children}
      {onFiltersReset && (
        <Button variant="ghost" size="sm" onClick={onFiltersReset} className="mb-0.5">
          <SlidersHorizontal className="size-3.5" /> Reset
        </Button>
      )}
    </div>
  );
}