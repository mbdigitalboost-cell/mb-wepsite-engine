import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
import { STORE_DOMAINS } from "@/lib/commerce/public/store-domains";
import { getCurrentSite } from "@/lib/sites/current";
import { decideRoute } from "@/lib/sites/route-policy";

/**
 * Faz 28 — "her Vercel projesi = tek site". Bu dosya artık KARAR VERMİYOR:
 * kararı lib/sites/route-policy.ts'teki saf `decideRoute()` verir (birim
 * testli: tests/route-policy.test.ts), burası yalnız uygular. Hangi sitenin
 * sunulduğu SITE_KEY env'inden gelir (lib/sites/registry.ts).
 *
 * Tarihçe (korunuyor, çünkü kararların nedeni bunlar):
 *  - Faz 14: PANEL_ONLY_MODE=true panel projesinde her şeyi /login'e
 *    gönderiyordu (allowlist) — artık route-policy'nin "panel" dalı, aynı
 *    allowlist + kök → /login.
 *  - FAZ 5.1d: /mfa-challenge allowlist'te olmadığı için panelde sonsuz
 *    yönlendirme döngüsü yaşandı — route-policy ADMIN_PREFIXES'te var ve
 *    testte sabitlendi.
 *  - Faz 11: kök → /store/taktikalp46 next.config.ts redirects()'e konunca
 *    (o katman proxy'den ÖNCE ve site-kör çalışır) panel kökü de mağazaya
 *    gitti. Kök kararı bu yüzden burada, site'ye göre — slug artık sabit
 *    kod değil, registry'den.
 *  - Faz 28: mağaza projesi ("değilse mağaza") başka hiçbir yolu
 *    kısıtlamıyordu; t46store.com Petra'nın sayfalarını ve 404'ünü
 *    sunuyordu. Artık varsayılan kapalı.
 */

/**
 * Domain-bazlı mağaza yönlendirmesi (2026-09 karar: Petra tarzı "her
 * müşteriye ayrı branch + ayrı Vercel projesi" yerine tek deployment +
 * host-bazlı rewrite — yeni müşteri eklemek için kod/deployment
 * çoğaltmaya gerek kalmasın diye). STORE_DOMAINS'te (bkz.
 * lib/commerce/public/store-domains.ts) kayıtlı bir domain'den istek
 * gelirse, ziyaretçiye HİÇ GÖRÜNMEDEN /store/<slug>'a rewrite edilir —
 * adres çubuğunda her zaman kendi domain'i görünür, /store/<slug> asla
 * görünmez. PANEL_ONLY_MODE kontrolünden ÖNCE çalışır ve eşleşirse hemen
 * döner, böylece bir custom domain ziyaretçisi PANEL_ONLY_MODE ne olursa
 * olsun asla /login'e düşmez. STORE_DOMAINS boşken (henüz hiç domain
 * eklenmemişken) bu fonksiyon her zaman null döner — yani bu değişiklik
 * bir domain gerçekten eklenene kadar mevcut davranışı SIFIR etkiler.
 */
function rewriteForStoreDomain(request: NextRequest): NextResponse | null {
  const hostname = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const storeSlug = STORE_DOMAINS[hostname];
  if (!storeSlug) return null;

  const url = request.nextUrl.clone();
  const suffix = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/store/${storeSlug}${suffix}`;
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  // Not: STORE_DOMAINS bugün boş (bkz. Faz 28 Kısım D envanteri — temiz
  // adresler ayrı fazda); boşken bu her zaman null döner.
  const domainRewrite = rewriteForStoreDomain(request);
  if (domainRewrite) return domainRewrite;

  const decision = decideRoute({ site: getCurrentSite(), pathname: request.nextUrl.pathname });

  switch (decision.type) {
    case "redirect": {
      const target = new URL(decision.target, request.url);
      // Siteler arası 308'de sorgu dizesi korunur (ör. ?code=… / filtreler).
      if (decision.status === 308) target.search = request.nextUrl.search;
      return NextResponse.redirect(target, decision.status);
    }
    case "rewrite":
      return NextResponse.rewrite(new URL(decision.target, request.url));
    case "notFound":
      // Sitenin kendi markalı 404'ü; HTTP durum kodunu o sayfa (notFound()) 404 yapar.
      return NextResponse.rewrite(new URL(decision.rewriteTo, request.url));
    case "next":
      return updateSupabaseSession(request);
  }
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets and Next.js internals, so
     * the auth session cookie stays fresh everywhere without wasting
     * cycles on image/font/etc. requests.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
