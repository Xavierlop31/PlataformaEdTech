import type { HTMLAttributes } from "react";
import { cn } from "@/app/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-surface bg-carbon-raised p-4 shadow-sm",
        className
      )}
      {...props}
    />
  );
}
