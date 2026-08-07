import type { HTMLAttributes } from "react";
import { cn } from "@/app/lib/cn";

type Tone = "papaya" | "speedline" | "muted" | "success" | "danger";

const tones: Record<Tone, string> = {
  papaya: "bg-papaya/15 text-papaya",
  speedline: "bg-speedline/15 text-speedline",
  muted: "bg-surface text-muted",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
};

export function Badge({
  tone = "muted",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
