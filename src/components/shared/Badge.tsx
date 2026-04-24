import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "default" | "primary" | "success" | "warning" | "danger" | "outline";

const styles: Record<Variant, string> = {
  default: "bg-secondary text-secondary-foreground",
  primary: "bg-primary-soft text-primary-dark dark:text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
  outline: "border border-border text-foreground bg-transparent",
};

export function Badge({ children, variant = "default", className }: { children: ReactNode; variant?: Variant; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", styles[variant], className)}>{children}</span>;
}
