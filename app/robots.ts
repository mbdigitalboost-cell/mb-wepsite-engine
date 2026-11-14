import type { MetadataRoute } from "next";
import { getCurrentSite } from "@/lib/sites/current";

/**
 * Faz 28 — robots SİTEYE GÖRE; Sitemap satırı her zaman o sitenin kendi
 * canonicalOrigin'i (önceden mağaza projesinde http://localhost:3000).
 *  - panel: her şey kapalı, sitemap yok.
 *  - store: kök açık (temiz adresler, Faz 29); sepet/ödeme/hesap/siparişlerim
 *    (kişisel sayfalar), /dashboard ve /api kapalı.
 *  - corporate: bugünkü kural (/ açık, /dashboard kapalı).
 */
export default function robots(): MetadataRoute.Robots {
  const site = getCurrentSite();

  if (site.kind === "panel") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const sitemap = `${site.canonicalOrigin}/sitemap.xml`;

  if (site.kind === "store") {
    // Faz 29 — temiz adresler: mağaza sitenin kökünde.
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/dashboard", "/api/", "/sepet", "/odeme", "/hesap", "/siparislerim"],
        },
      ],
      sitemap,
    };
  }

  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard"] }], sitemap };
}
