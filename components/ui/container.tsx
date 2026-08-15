import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

/**
 * Max-width content wrapper with responsive horizontal padding. Every
 * section on every customer site should sit inside one of these so page
 * widths stay consistent without repeating the same Tailwind classes.
 */
export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
