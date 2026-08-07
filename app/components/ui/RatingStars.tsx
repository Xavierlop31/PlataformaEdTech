import { cn } from "@/app/lib/cn";

export function RatingStars({
  value,
  size = "sm",
}: {
  value: number | null;
  size?: "sm" | "md";
}) {
  const rounded = value ? Math.round(value) : 0;
  const dims = size === "md" ? "text-lg" : "text-sm";

  return (
    <span className={cn("inline-flex items-center gap-0.5", dims)} aria-label={value ? `${value.toFixed(1)} de 5` : "Sin reviews"}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rounded ? "text-papaya" : "text-surface-bright"}>
          ★
        </span>
      ))}
      {value != null && (
        <span className="ml-1 text-xs text-muted">{value.toFixed(1)}</span>
      )}
    </span>
  );
}
