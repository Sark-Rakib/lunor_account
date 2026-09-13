import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title = "Nothing here yet", description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
          <Icon className="size-6" />
        </div>
      )}
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
      {description && <p className="max-w-sm text-xs text-zinc-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}