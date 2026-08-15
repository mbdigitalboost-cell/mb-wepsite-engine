"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface CustomerCmsNavProps {
  customerId: string;
}

const CONTENT_LINKS = [
  { segment: "hero", label: "Hero" },
  { segment: "services", label: "Hizmetler" },
  { segment: "solutions", label: "Çözümler" },
  { segment: "projects", label: "Projeler" },
  { segment: "campaigns", label: "Kampanyalar" },
  { segment: "testimonials", label: "Referanslar" },
  { segment: "faqs", label: "SSS" },
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

  const topLevel = [
    { href: `${base}/content`, label: "İçerik", match: `${base}/content` },
    { href: `${base}/media`, label: "Medya", match: `${base}/media` },
    { href: `${base}/seo`, label: "SEO", match: `${base}/seo` },
    { href: `${base}/tracking`, label: "Tracking", match: `${base}/tracking` },
    { href: `${base}/leads`, label: "Talepler", match: `${base}/leads` },
    { href: `${base}/settings`, label: "Site Ayarları", match: `${base}/settings` },
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
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-black/5 text-foreground" : "text-foreground/60 hover:bg-black/5 hover:text-foreground",
              )}
            >
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
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive ? "bg-black/5 text-foreground" : "text-foreground/50 hover:bg-black/5 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
