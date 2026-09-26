import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "outline" | "solid" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/**
 * success/warning/danger/info added for FAZ 2.5's order/payment status
 * badges ("büyük net renkli rozetler... teknik olmayan bir kullanıcı için
 * okunabilir olsun") — each is a COMPLETE, self-contained class string,
 * never combined with an externally-passed `className` for color. `cn`
 * (lib/utils/cn.ts) is a naive string-join, not tailwind-merge, so mixing
 * a caller's own color classes with outline/solid's own border-current/
 * bg-brand-primary would leave the winner up to Tailwind's generated-CSS
 * order rather than source order — the exact bug already found and fixed
 * once this session in the products list's bulk-select `<select>`. New
 * variants avoid that by being complete on their own.
 */
const variantClasses: Record<BadgeVariant, string> = {
  outline: "border border-current/30 text-current",
  solid: "bg-brand-primary text-white",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export function Badge({ variant = "outline", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-brand,0.25rem)] px-3 py-1 text-xs font-medium uppercase tracking-wider",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
