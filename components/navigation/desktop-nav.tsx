"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { PetraNavLink } from "@/lib/data/petra/types";

export function DesktopNav({ links }: { links: PetraNavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Ana menü" className="hidden items-center gap-8 lg:flex">
      {links.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "text-sm font-medium tracking-wide transition-colors",
              isActive ? "text-white" : "text-white/70 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
