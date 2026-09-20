import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("flex items-center justify-between gap-3 p-4 pb-0 md:p-5 md:pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-sm font-semibold text-zinc-900 dark:text-zinc-100", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-xs text-zinc-500", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-4 md:p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn("flex items-center gap-3 border-t border-zinc-200 dark:border-zinc-800 p-4 md:p-5", className)} {...props} />;
}