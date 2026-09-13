import {
  petraAlternateName,
  petraBusinessAddress,
  petraContactInfo,
  petraSiteName,
  petraSocialLinks,
} from "@/lib/data/petra/site-config";
import { publicEnv } from "@/lib/config/env";
import type { PetraFaq } from "@/lib/data/petra/types";

/**
 * Faz C: single shared `@id` for the site's one business identity —
 * `petraLocalBusinessStructuredData()` and `petraOrganizationStructuredData()`
 * both use it, but (per `app/(public)/page.tsx`) only ever ONE of the two
 * is ever rendered on a given request, so the shared value never creates
 * a duplicate/conflicting `@id` on the same page.
 */
const PETRA_BUSINESS_ID = `${publicEnv.siteUrl}/#business`;

/**
 * JSON-LD builders. Each one returns `null` when it doesn't have enough
 * *confirmed* data to be truthful — callers must check for `null` and
 * render nothing, never fall back to a guessed value. This is what keeps
 * structured data from ever asserting a fake LocalBusiness fact (brief
 * §20/§38: "Sahte işletme bilgisi üretme").
 */

/**
 * Faz 6E: `faqs` is now a required parameter — the caller passes the same
 * CMS-or-static-fallback array already resolved for the visible FAQ
 * accordion (see app/(public)/page.tsx), so the JSON-LD never drifts from
 * what the page actually renders.
 */
export function petraFaqStructuredData(faqs: PetraFaq[]) {
  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Only emits `LocalBusiness` once both a real address and phone number
 * are confirmed — a partial/best-guess LocalBusiness entry is worse than
 * none, since search engines treat it as a factual claim.
 *
 * Faz C: `address` now uses `petraBusinessAddress` (schema.org
 * `PostalAddress`, see lib/data/petra/site-config.ts) instead of the
 * plain `petraContactInfo.address` display string — Google expects a
 * structured address object here, not free text. `geo` uses the same
 * customer-supplied coordinates already embedded in `petraContactInfo.mapUrl`
 * (confirmed 2026-08-17, unchanged). `@id` lets this and
 * `petraOrganizationStructuredData()` share one entity identity even
 * though (per app/(public)/page.tsx) they never render on the same page.
 */
export function petraLocalBusinessStructuredData() {
  if (!petraContactInfo.address || !petraContactInfo.phone) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HVACBusiness",
    "@id": PETRA_BUSINESS_ID,
    name: petraSiteName,
    ...(petraAlternateName ? { alternateName: petraAlternateName } : {}),
    telephone: petraContactInfo.phone,
    url: publicEnv.siteUrl,
    logo: `${publicEnv.siteUrl}/icon.png`,
    address: {
      "@type": "PostalAddress",
      ...petraBusinessAddress,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 37.58518,
      longitude: 36.92165,
    },
    ...(petraContactInfo.serviceArea ? { areaServed: petraContactInfo.serviceArea } : {}),
    ...(petraSocialLinks.length > 0 ? { sameAs: petraSocialLinks.map((link) => link.url) } : {}),
  };
}

/**
 * Faz SEO-3: `logo`, `app/icon.png`'a (Faz favicon fazında Petra'nın
 * kendi hero fotoğrafından çıkarılmış GERÇEK marka ikonu — bkz.
 * PETRA_FAVICON_IMPLEMENTATION_REPORT.md §9) işaret ediyor —
 * `petraBrandAssets.logoSrcDark/Light` hâlâ `null` (gerçek bir logo
 * dosyası henüz sağlanmadı) olduğu için başka gerçek bir marka görseli
 * yok; uydurma bir görsel yerine ZATEN CANLIDA OLAN bu ikonu kullanmak,
 * hiçbir yeni varlık üretmeden `logo` alanını dolduruyor. `sameAs`,
 * SADECE müşterinin gerçek/teyitli sosyal hesabı olan `petraSocialLinks`
 * dizisinden geliyor — bugün tek satır (Instagram).
 */
export function petraOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": PETRA_BUSINESS_ID,
    name: petraSiteName,
    url: publicEnv.siteUrl,
    logo: `${publicEnv.siteUrl}/icon.png`,
    ...(petraContactInfo.phone ? { telephone: petraContactInfo.phone } : {}),
    ...(petraContactInfo.address ? { address: petraContactInfo.address } : {}),
    ...(petraSocialLinks.length > 0 ? { sameAs: petraSocialLinks.map((link) => link.url) } : {}),
  };
}

/** Faz SEO-3: minimum `WebSite` şeması — sitelinks searchbox gibi ek
 * özellikler (potentialAction) GERÇEK bir site-içi arama özelliği
 * olmadığı için EKLENMEDİ (uydurma bir yetenek beyan etmemek için). */
export function petraWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: petraSiteName,
    url: publicEnv.siteUrl,
  };
}

export function petraBreadcrumbStructuredData(items: { name: string; path: string }[]) {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${publicEnv.siteUrl}${item.path}`,
    })),
  };
}
