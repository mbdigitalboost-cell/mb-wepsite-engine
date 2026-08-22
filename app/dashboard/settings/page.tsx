import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { listTotpFactors } from "@/lib/auth/mfa";
import { MfaSection } from "./mfa-section";

export default async function DashboardSettingsPage() {
  const { user } = await requireSession();
  const totpFactors = await listTotpFactors();

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Ayarlar</h1>

      <div className="mt-6 max-w-md rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">Hesap</h2>
        <p className="mt-2 text-sm text-foreground/60">{user.email}</p>
        <Link
          href="/auth/set-password"
          className="mt-3 inline-block text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
        >
          Şifre Değiştir
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-lg border border-black/10 p-5">
        <h2 className="text-sm font-semibold tracking-tight">İki Adımlı Doğrulama</h2>
        <div className="mt-3">
          <MfaSection factors={totpFactors} />
        </div>
      </div>

      <p className="mt-6 text-sm text-foreground/60">
        Entegrasyon ayarları (tracking, SEO, domain) sonraki fazlarda buraya
        eklenecek.
      </p>
    </div>
  );
}
