import type { PetraNavLink } from "@/lib/data/petra/types";

export const petraNavLinks: PetraNavLink[] = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/cozumler", label: "Çözümler" },
  { href: "/hizmetler", label: "Hizmetler" },
  { href: "/projeler", label: "Projeler" },
  { href: "/kampanyalar", label: "Kampanyalar" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
];

/**
 * Faz 12: real routes (see app/(public)/{slug}/page.tsx for each) — every
 * page currently renders an honest "hazırlanıyor" placeholder rather than
 * invented legal text (see components/legal/legal-placeholder.tsx's doc).
 * Kept as its own list (not merged into `petraNavLinks`) so the footer can
 * render it as a visually distinct "Yasal" column, matching how most
 * corporate sites separate primary nav from legal/policy links.
 */
export const petraLegalLinks: PetraNavLink[] = [
  { href: "/gizlilik-politikasi", label: "Gizlilik Politikası" },
  { href: "/kvkk-aydinlatma-metni", label: "KVKK Aydınlatma Metni" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
];

export const petraHeaderNavLinks: PetraNavLink[] = [
  ...petraNavLinks,
  { href: "/btu-hesaplama", label: "BTU Hesaplama" },
];
