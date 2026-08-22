import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSession } from "@/lib/auth/require-session";
import { getCurrentMemberships, isAdminMembership } from "@/lib/auth/get-memberships";
import { getAalStatus, needsMfaChallenge } from "@/lib/auth/mfa";

export const metadata: Metadata = {
  title: "Panel",
  // Internal panel should never be indexed by search engines.
  robots: { index: false, follow: false },
};

// Every /dashboard/* response is per-user and must never be served from a
// static/CDN cache. Explicit, rather than relying on Next's automatic
// "calling cookies() makes a route dynamic" detection — that detection
// only kicks in once Supabase env vars exist; before that,
// requireSession() short-circuits before touching cookies() at all,
// which would otherwise let this get statically prerendered (and its
// /login redirect baked in as a static response for everyone).
export const dynamic = "force-dynamic";

/**
 * Single choke point for the entire /dashboard/* tree: `requireSession()`
 * redirects to /login before anything below this ever renders if there
 * is no valid session. Individual dashboard pages do not need to (and
 * should not need to) repeat this check.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user } = await requireSession();

  // Güvenlik (Phase 1, MFA): bir kullanıcının doğrulanmış bir TOTP
  // faktörü varsa ama BU oturum henüz onu tamamlamadıysa (ör. şifreyle
  // yeni giriş yapıldı, ikinci faktör henüz girilmedi), dashboard'un
  // HİÇBİR sayfası/içeriği render edilmeden önce buraya bakılıyor — tek
  // kontrol noktası, tek yerde. Faktörü olmayan bir kullanıcı için
  // `needsMfaChallenge` her zaman false döner (nextLevel hiç "aal2"
  // olmaz), yani MFA kurmamış biri için hiçbir davranış değişmiyor.
  const aal = await getAalStatus();
  if (needsMfaChallenge(aal)) {
    redirect("/mfa-challenge");
  }

  const memberships = await getCurrentMemberships(user.id);
  const isAdmin = isAdminMembership(memberships);

  return (
    <DashboardShell userEmail={user.email ?? null} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  );
}
