"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Globe,
  Store,
  UserCog,
  Settings,
  ShoppingCart,
  Package,
  FolderTree,
  Tag,
  UserCircle,
  Compass,
  Home,
  Palette,
  Mail,
} from "lucide-react";
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
  /** Tek, dürüst kullanım: bu devir metninin kendisiyle gelen gerçekten yeni özellik (Kısım B'nin dashboard'u) — her linke rozet eklenmedi, sadece buna. */
  isNew?: boolean;
}

interface NavSection {
  title: string | null;
  links: NavLink[];
}

const adminLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Müşteriler", icon: Users },
  { href: "/dashboard/stores", label: "Mağazalar", icon: Store },
  { href: "/dashboard/websites", label: "Web Siteleri", icon: Globe },
  { href: "/dashboard/users", label: "Kullanıcılar", icon: UserCog },
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings },
];

const customerLinks: NavLink[] = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings },
];

/**
 * Admin Panel İşlevsellik devir metni, Kısım D — bir mağaza bağlamının
 * (`/dashboard/customers/{customerId}/stores/{storeId}/**`) İÇİNDEYKEN
 * kanvasın (AdminDashboard.dc.html/AdminUrunListesi.dc.html) GENEL/
 * KATALOG/MAĞAZA bölümlü menüsü gösterilir — mağaza bağlamı DIŞINDA
 * (platform admin'in kendi üst-seviye Müşteriler/Mağazalar/Web Siteleri
 * listesi gibi yerlerde) `adminLinks`/`customerLinks` HİÇ DEĞİŞMEDİ.
 *
 * Bu, store/page.tsx'in eski "Mağazayı Düzenle" <details> açılır
 * panelinin (Kısım B'nin kendi yorumunda "Kısım D bu linkleri sol menüye
 * taşıyacak" diye önceden işaret edilmişti) yerini alıyor — o panel bu
 * commit'te kaldırıldı, aynı hedeflere artık her sayfada SABİT/her zaman
 * görünür bu sidebar üzerinden gidiliyor.
 */
function buildStoreSections(customerId: string, storeId: string): NavSection[] {
  const base = `/dashboard/customers/${customerId}/stores/${storeId}`;
  return [
    {
      title: "GENEL",
      links: [
        { href: base, label: "Dashboard", icon: LayoutDashboard, isNew: true },
        { href: `${base}/orders`, label: "Siparişler", icon: ShoppingCart },
      ],
    },
    {
      title: "KATALOG",
      links: [
        { href: `${base}/products`, label: "Ürünler", icon: Package },
        { href: `${base}/categories`, label: "Kategoriler", icon: FolderTree },
        { href: `${base}/brands`, label: "Markalar", icon: Tag },
      ],
    },
    {
      title: "MAĞAZA",
      links: [
        { href: `${base}/profile`, label: "Profil", icon: UserCircle },
        { href: `${base}/settings`, label: "Ayarlar", icon: Settings },
        { href: `${base}/navigation`, label: "Navigasyon", icon: Compass },
        { href: `${base}/homepage`, label: "Ana Sayfa", icon: Home },
        { href: `${base}/branding`, label: "Branding", icon: Palette },
        { href: `${base}/subscribers`, label: "Aboneler", icon: Mail },
      ],
    },
  ];
}

function isLinkActive(pathname: string, href: string, exactRoots: Set<string>): boolean {
  return exactRoots.has(href) ? pathname === href : pathname.startsWith(href);
}

function NavLinkItem({ link, isActive }: { link: NavLink; isActive: boolean }) {
  return (
    <Link
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
      {link.isNew ? (
        <span className="ml-auto rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Yeni
        </span>
      ) : null}
    </Link>
  );
}

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
 * somehow, no route it links to would open up because of that. The same
 * applies to the store-context section below: customerId/storeId are
 * parsed from the pathname only to BUILD hrefs, never trusted for access
 * control — every target page still calls its own requireStoreAccess*
 * independently.
 *
 * `className` lets the shell reuse this as either a vertical sidebar
 * (desktop) or a horizontally-scrollable strip (mobile) without
 * duplicating the link list — see components/layout/dashboard-shell.tsx.
 */
export function DashboardNav({ isAdmin, className }: DashboardNavProps) {
  const pathname = usePathname();
  const storeMatch = pathname.match(/^\/dashboard\/customers\/([^/]+)\/stores\/([^/]+)/);

  if (storeMatch) {
    const [, customerId, storeId] = storeMatch;
    const sections = buildStoreSections(customerId, storeId);
    const storeRoot = `/dashboard/customers/${customerId}/stores/${storeId}`;
    const exactRoots = new Set([storeRoot]);

    return (
      <nav aria-label="Mağaza menüsü" className={className ?? "flex flex-col gap-4"}>
        {sections.map((section) => (
          <div key={section.title} className={className ? "flex shrink-0 items-center gap-1" : undefined}>
            {!className ? (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
                {section.title}
              </p>
            ) : null}
            <div className={className ? "flex items-center gap-1" : "flex flex-col gap-1"}>
              {section.links.map((link) => (
                <NavLinkItem key={link.href} link={link} isActive={isLinkActive(pathname, link.href, exactRoots)} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  const links = isAdmin ? adminLinks : customerLinks;
  const exactRoots = new Set(["/dashboard"]);

  return (
    <nav aria-label="Panel menüsü" className={className ?? "flex flex-col gap-1"}>
      {links.map((link) => (
        <NavLinkItem key={link.href} link={link} isActive={isLinkActive(pathname, link.href, exactRoots)} />
      ))}
    </nav>
  );
}
