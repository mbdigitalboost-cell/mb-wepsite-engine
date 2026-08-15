import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type IconSize = "sm" | "md" | "lg";

const sizeMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  strokeWidth?: number;
}

/**
 * Single entry point for every icon in the site. Wrapping `lucide-react`
 * here (instead of importing icons ad hoc in every component) is what
 * keeps stroke width / size / alignment consistent across the whole
 * design system — change the default here, not at each call site.
 */
export function Icon({ icon: LucideIconComponent, size = "md", className, strokeWidth = 1.75 }: IconProps) {
  return (
    <LucideIconComponent
      size={sizeMap[size]}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    />
  );
}
