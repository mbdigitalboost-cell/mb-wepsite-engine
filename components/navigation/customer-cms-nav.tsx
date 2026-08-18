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
  FolderKanban,
  Megaphone,
  MessageSquareQuote,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";

interface CustomerCmsNavProps {
  customerId: string;
}

const CONTENT_LINKS: { segment: string; label: string; icon: LucideIcon }[] = [
  { segment: "hero", label: "Hero", icon: Sparkles },
  { segment: "services", label: "Hizmetler", icon: Wrench },
  { segment: "solutions", label: "Çözümler", icon: Layers },
  { segment: "projects", label: "Projeler", icon: FolderKanban },
  { segment: "campaigns", label: "Kampanyalar", icon: Megaphone },
  { segment: "testimonials", label: "Referanslar", icon: MessageSquareQuote },
  { segment: "faqs", label: "SSS", icon: HelpCircle },
];

/**
 * Sub-navigation shown on every CMS page under
 * `/dashboard/customers/[customerId]/...` — content editors, media, seo,
 * tracking, leads, site settings. Same "links only, real gate is
 * server-side" pattern as components/navigation/dashboard-nav.tsx: every
 * route this points to independently calls requireCustomerAccess() (see
 * lib/auth/require-customer-access.ts), so hiding/showing a link here is
 * purely cosmetic.
 */
export function CustomerCmsNav({ customerId }: CustomerCmsNavProps) {
  const pathname = usePathname();
  const base = `/dashboard/customers/${customerId}`;

  const topLevel: { href: string; label: string; match: string; icon: LucideIcon }[] = [
    { href: `${base}/content`, label: "İçerik", match: `${base}/content`, icon: FileText },
    { href: `${base}/media`, label: "Medya", match: `${base}/media`, icon: ImageIcon },
    { href: `${base}/seo`, label: "SEO", match: `${base}/seo`, icon: Search },
    { href: `${base}/tracking`, label: "Tracking", match: `${base}/tracking`, icon: BarChart3 },
    { href: `${base}/leads`, label: "Talepler", match: `${base}/leads`, icon: Inbox },
    { href: `${base}/settings`, label: "Site Ayarları", match: `${base}/settings`, icon: Settings2 },
  ];

  const isContentSection = pathname.startsWith(`${base}/content`);

  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="CMS bölümleri" className="flex flex-wrap gap-1 border-b border-black/10 pb-3">
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
