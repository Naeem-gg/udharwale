import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:opacity-92",
  secondary:
    "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
  outline:
    "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
  ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-92",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-11 px-5 py-2",
  sm: "h-9 px-3 text-xs",
  lg: "h-12 px-7 text-sm",
  icon: "h-10 w-10 p-0",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    variants[variant],
    sizes[size],
    className
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
);
Button.displayName = "Button";
