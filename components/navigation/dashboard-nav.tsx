"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Globe, Store, UserCog, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";

interface DashboardNavProps {
  isAdmin: boolean;
  className?: string;
}

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const adminLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Müşteriler", icon: Users },
  { href: "/dashboard/websites", label: "Web Siteleri", icon: Globe },
  { href: "/dashboard/stores", label: "Mağazalar", icon: Store },
  { href: "/dashboard/users", label: "Kullanıcılar", icon: UserCog },
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings },
];

const customerLinks: NavLink[] = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings },
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
              "flex shrink-0 items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                : "border-transparent text-foreground/60 hover:bg-black/5 hover:text-foreground",
            )}
          >
            <Icon icon={link.icon} size="sm" className={isActive ? "text-brand-accent" : "text-foreground/40"} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
