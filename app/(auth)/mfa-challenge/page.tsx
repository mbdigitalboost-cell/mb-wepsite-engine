import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getAalStatus, needsMfaChallenge } from "@/lib/auth/mfa";
import { MfaChallengeForm } from "./mfa-challenge-form";

export const metadata: Metadata = {
  title: "Doğrulama Gerekli",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Phase 1 (PHASE_0 sonrası MFA eklentisi). Bu sayfaya sadece iki yoldan
 * gelinir: (1) app/dashboard/layout.tsx, oturumun `nextLevel === "aal2"`
 * olduğunu ama `currentLevel`'ın henüz öyle olmadığını görünce buraya
 * yönlendirir; (2) kullanıcı zaten aal2'ye ulaşmışsa (ör. bu sayfayı
 * favorilere eklemiş biri) doğrudan /dashboard'a gönderilir — burada
 * gösterilecek bir şey yok.
 */
export default async function MfaChallengePage() {
  await requireSession();

  const aal = await getAalStatus();
  if (!needsMfaChallenge(aal)) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/images/mb-digital-boost/mb-mark.png"
            alt="MB Digital Boost"
            width={40}
            height={40}
            className="mx-auto"
            priority
          />
          <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">MB Digital Boost</p>
          <h1 className="mt-2 text-xl font-semibold text-foreground">İki Adımlı Doğrulama</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Kimlik doğrulama uygulamanızdaki 6 haneli kodu girin.
          </p>
        </div>

        <div className="rounded-lg border border-black/10 p-6 shadow-sm">
          <MfaChallengeForm />
        </div>
      </div>
    </main>
  );
}
