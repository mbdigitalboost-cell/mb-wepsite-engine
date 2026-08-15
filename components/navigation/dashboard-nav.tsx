"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface DashboardNavProps {
  isAdmin: boolean;
  className?: string;
}

const adminLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/customers", label: "Müşteriler" },
  { href: "/dashboard/websites", label: "Web Siteleri" },
  { href: "/dashboard/users", label: "Kullanıcılar" },
  { href: "/dashboard/settings", label: "Ayarlar" },
];

const customerLinks = [
  { href: "/dashboard", label: "Genel Bakış" },
  { href: "/dashboard/settings", label: "Ayarlar" },
];

/**
 * Dashboard sidebar navigation. Client Component because active-link
 * highlighting needs the live pathname (layouts don't re-render on
 * navigation — see Next.js docs on `usePathname`).
 *
 * `isAdmin` only decides which LINKS are shown — it is a UX nicety, not
 * a security check. Every route these links point to enforces its own
 * access rule server-side regardless of what's rendered here (see
 * requireAdmin() in app/dashboard/websites/page.tsx and
 * requireCustomerAccess() in app/dashboard/customers/[customerId]/page.tsx).
 * Even if this component were skipped or its `isAdmin` prop spoofed
 * somehow, no route it links to would open up because of that.
 *
 * `className` lets the shell reuse this as either a vertical sidebar
 * (desktop) or a horizontally-scrollable strip (mobile) without
 * duplicating the link list — see components/layout/dashboard-shell.tsx.
 */
export function DashboardNav({ isAdmin, className }: DashboardNavProps) {
  const pathname = usePathname();
  const links = isAdmin ? adminLinks : customerLinks;

  return (
    <nav aria-label="Panel menüsü" className={className ?? "flex flex-col gap-1"}>
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard"
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-black/5 text-foreground"
                : "text-foreground/60 hover:bg-black/5 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
