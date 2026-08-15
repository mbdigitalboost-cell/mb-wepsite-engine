import { petraFaqs } from "@/lib/data/petra/faqs";
import { petraContactInfo, petraSiteName } from "@/lib/data/petra/site-config";
import { publicEnv } from "@/lib/config/env";

/**
 * JSON-LD builders. Each one returns `null` when it doesn't have enough
 * *confirmed* data to be truthful — callers must check for `null` and
 * render nothing, never fall back to a guessed value. This is what keeps
 * structured data from ever asserting a fake LocalBusiness fact (brief
 * §20/§38: "Sahte işletme bilgisi üretme").
 */

export function petraFaqStructuredData() {
  if (petraFaqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: petraFaqs.map((faq) => ({
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
