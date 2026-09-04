"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  Search,
  BarChart3,
  Inbox,
  Settings2,
  Sparkles,
  Wrench,
  Layers,
  Package,
  FolderKanban,
  Megaphone,
  MessageSquareQuote,
  HelpCircle,
  LayoutDashboard,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";

interface CustomerCmsNavProps {
  customerId: string;
}

const CONTENT_LINKS: { segment: string; label: string; icon: LucideIcon }[] = [
  { segment: "hero", label: "Ana Sayfa", icon: Sparkles },
  { segment: "services", label: "Hizmetler", icon: Wrench },
  { segment: "solutions", label: "Çözümler", icon: Layers },
  { segment: "product_showcase_items", label: "Ürün Yelpazesi", icon: Package },
  { segment: "projects", label: "Projeler", icon: FolderKanban },
  { segment: "campaigns", label: "Kampanyalar", icon: Megaphone },
  { segment: "testimonials", label: "Referanslar", icon: MessageSquareQuote },
  { segment: "faqs", label: "SSS", icon: HelpCircle },
];

export function CustomerCmsNav({ customerId }: CustomerCmsNavProps) {
  const pathname = usePathname();
  const base = `/dashboard/customers/${customerId}`;

  const isOverviewActive = pathname === base;
  const isContentSection = pathname.startsWith(`${base}/content`);

  const topLevel: { href: string; label: string; match: string; icon: LucideIcon }[] = [
    { href: `${base}/content`, label: "Sayfalar", match: `${base}/content`, icon: FileText },
    { href: `${base}/navigation`, label: "Menü", match: `${base}/navigation`, icon: Menu },
    { href: `${base}/media`, label: "Medya", match: `${base}/media`, icon: ImageIcon },
    { href: `${base}/seo`, label: "SEO", match: `${base}/seo`, icon: Search },
    { href: `${base}/tracking`, label: "Tracking", match: `${base}/tracking`, icon: BarChart3 },
    { href: `${base}/leads`, label: "Talepler", match: `${base}/leads`, icon: Inbox },
    { href: `${base}/settings`, label: "Site Ayarları", match: `${base}/settings`, icon: Settings2 },
  ];

  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="Müşteri bölümleri" className="flex flex-wrap items-center gap-1 border-b border-black/10 pb-3">
        <Link
          href={base}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            isOverviewActive
              ? "bg-brand-accent/10 text-brand-accent"
              : "text-foreground/60 hover:bg-black/5 hover:text-foreground",
          )}
        >
          <Icon icon={LayoutDashboard} size="sm" className={isOverviewActive ? "text-brand-accent" : "text-foreground/40"} />
          Genel Bakış
        </Link>

        <span className="mx-1 hidden h-4 w-px bg-black/10 sm:block" aria-hidden="true" />
        <span className="px-1 text-xs font-semibold tracking-wide text-foreground/40 uppercase">Web Sitesi</span>

        {topLevel.map((link) => {
          const isActive = pathname === link.match || pathname.startsWith(`${link.match}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-accent/10 text-brand-accent"
                  : "text-foreground/60 hover:bg-black/5 hover:text-foreground",
              )}
            >
              <Icon icon={link.icon} size="sm" className={isActive ? "text-brand-accent" : "text-foreground/40"} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {isContentSection ? (
        <nav aria-label="İçerik türleri" className="flex flex-wrap gap-1">
          {CONTENT_LINKS.map((link) => {
            const href = `${base}/content/${link.segment}`;
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={link.segment}
                href={href}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-brand-accent/10 text-brand-accent"
                    : "text-foreground/50 hover:bg-black/5 hover:text-foreground",
                )}
              >
                <Icon icon={link.icon} size="sm" className={isActive ? "text-brand-accent" : "text-foreground/35"} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
