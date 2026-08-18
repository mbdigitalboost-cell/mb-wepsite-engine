import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

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

const PANEL_ALLOWED_PATH_PREFIXES = ["/dashboard", "/login", "/auth", "/api", "/_next", "/favicon.ico"];

function isPanelAllowedPath(pathname: string) {
  return PANEL_ALLOWED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
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
