import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = {
  title: "Şifre Belirle",
  robots: { index: false, follow: false },
};

// Session-dependent (requireSession reads cookies) — see app/dashboard/layout.tsx
// for why this needs to be explicit rather than relying on automatic detection.
export const dynamic = "force-dynamic";

/**
 * Reached two ways: (1) a freshly invited user, right after
 * /auth/callback?next=/auth/set-password establishes their session, with
 * no password of their own yet; (2) anyone already logged in who clicks
 * "Şifre Değiştir" from /dashboard/settings. Both cases are just "an
 * authenticated session sets its own password" — requireSession() is the
 * only gate needed, no invite-specific state to check.
 */
export default async function SetPasswordPage() {
  await requireSession();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Şifre Belirle</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Hesabınız için yeni bir şifre belirleyin.
        </p>
        <div className="mt-6">
          <SetPasswordForm />
        </div>
      </div>
    </div>
  );
}
