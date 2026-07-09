import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive" | "success" | "warning";

const variants: Record<AlertVariant, string> = {
  default: "border-border bg-secondary/60 text-secondary-foreground",
  destructive: "border-destructive/30 bg-destructive/10 text-rose-200",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-200",
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full items-start gap-2.5 rounded-md border p-3 text-sm",
        variants[variant],
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = "Alert";
