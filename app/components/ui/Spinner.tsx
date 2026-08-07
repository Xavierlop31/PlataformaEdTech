import { cn } from "@/app/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-papaya",
        className
      )}
    />
  );
}
