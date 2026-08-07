import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/app/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-papaya text-carbon font-semibold hover:bg-papaya-hover disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-surface text-foreground hover:bg-surface-bright disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-foreground border border-surface hover:bg-surface disabled:opacity-50",
  danger:
    "bg-danger text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-papaya",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
