import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "destructive";

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary/15 text-primary border-primary/30",
  secondary: "bg-secondary text-secondary-foreground border-border",
  success: "bg-emerald-500/12 text-emerald-300 border-emerald-400/25",
  destructive: "bg-destructive/12 text-rose-300 border-destructive/25",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
