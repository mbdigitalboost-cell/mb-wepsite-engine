import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
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
 *  - Faz 29: temiz mağaza adresleri (t46store.com/urun/x) route-policy'de
 *    iç route'a rewrite edilir. Boş kalmış STORE_DOMAINS host-rewrite'ı
 *    (2026-09) kaldırıldı; domain ↔ mağaza tek kaynağı lib/sites/registry.ts.
 */

export async function proxy(request: NextRequest) {
  const decision = decideRoute({ site: getCurrentSite(), pathname: request.nextUrl.pathname });

  switch (decision.type) {
    case "redirect": {
      const target = new URL(decision.target, request.url);
      // 308'lerde (siteler arası ve eski /store/<slug> → temiz adres) sorgu dizesi korunur.
      if (decision.status === 308) target.search = request.nextUrl.search;
      return NextResponse.redirect(target, decision.status);
    }
    case "rewrite": {
      // Faz 29 — temiz mağaza adresi → iç route. Sorgu dizesi korunur;
      // oturum çerezi de yenilenir (sepet/hesap/ödeme bu yoldan gelir).
      const target = new URL(decision.target, request.url);
      target.search = request.nextUrl.search;
      return updateSupabaseSession(request, target);
    }
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
