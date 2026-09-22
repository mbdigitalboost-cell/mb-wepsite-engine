import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
import { STORE_DOMAINS } from "@/lib/commerce/public/store-domains";

/**
 * Faz 14 (panel domain ayrımı): this codebase is deployed twice from the
 * SAME repo — once as the customer-facing site (petra-muhendislik.vercel.app)
 * and once as the shared MB Digital Boost panel
 * (mb-digital-boost-web-panel.vercel.app, meant for every website
 * customer's login, not just Petra's). Both deployments contain the exact
 * same public marketing pages (app/(public)/...) — without this flag,
 * visiting the panel deployment's "/" would show Petra's homepage, which
 * is confusing/wrong once there are other customers too.
 *
 * `PANEL_ONLY_MODE=true` (set only on the panel project's Vercel env, NOT
 * on petra-muhendislik) makes every route except the panel's own
 * (/dashboard, /login, /auth, /api, Next internals) redirect to /login —
 * so the panel deployment only ever shows the panel, never a customer's
 * public site.
 */
const PANEL_ONLY_MODE = process.env.PANEL_ONLY_MODE === "true";

const PANEL_ALLOWED_PATH_PREFIXES = ["/dashboard", "/login", "/auth", "/api", "/_next", "/favicon.ico", "/store"];

function isPanelAllowedPath(pathname: string) {
  return PANEL_ALLOWED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

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
  const domainRewrite = rewriteForStoreDomain(request);
  if (domainRewrite) return domainRewrite;

  if (PANEL_ONLY_MODE && !isPanelAllowedPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return updateSupabaseSession(request);
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
