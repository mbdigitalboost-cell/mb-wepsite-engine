import { petraContactInfo, petraSiteName } from "@/lib/data/petra/site-config";
import { publicEnv } from "@/lib/config/env";
import type { PetraFaq } from "@/lib/data/petra/types";

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
 */
export function petraLocalBusinessStructuredData() {
  if (!petraContactInfo.address || !petraContactInfo.phone) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HVACBusiness",
    name: petraSiteName,
    telephone: petraContactInfo.phone,
    address: petraContactInfo.address,
    url: publicEnv.siteUrl,
    ...(petraContactInfo.serviceArea ? { areaServed: petraContactInfo.serviceArea } : {}),
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
