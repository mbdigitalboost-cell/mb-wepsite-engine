import type { MetadataRoute } from "next";
import { getCurrentSite } from "@/lib/sites/current";
import { storeBasePath } from "@/lib/sites/registry";

/**
 * Faz 28 — robots SİTEYE GÖRE; Sitemap satırı her zaman o sitenin kendi
 * canonicalOrigin'i (önceden mağaza projesinde http://localhost:3000).
 *  - panel: her şey kapalı, sitemap yok.
 *  - store: yalnız kendi mağaza yolu; sepet/ödeme/hesap/siparişlerim
 *    (kişisel sayfalar), /dashboard ve /api kapalı.
 *  - corporate: bugünkü kural (/ açık, /dashboard kapalı).
 */
export default function robots(): MetadataRoute.Robots {
  const site = getCurrentSite();

  if (site.kind === "panel") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const sitemap = `${site.canonicalOrigin}/sitemap.xml`;
  const base = storeBasePath(site);

  if (base) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: `${base}/`,
          disallow: ["/dashboard", "/api/", `${base}/sepet`, `${base}/odeme`, `${base}/hesap`, `${base}/siparislerim`],
        },
      ],
      sitemap,
    };
  }

  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard"] }], sitemap };
}
