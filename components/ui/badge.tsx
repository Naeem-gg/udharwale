import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "destructive";

const variants: Record<BadgeVariant, string> = {
  default: "bg-accent text-accent-foreground border-transparent",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  success: "bg-emerald-500/10 text-emerald-700 border-transparent dark:text-emerald-300",
  destructive: "bg-destructive/10 text-destructive border-transparent",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
