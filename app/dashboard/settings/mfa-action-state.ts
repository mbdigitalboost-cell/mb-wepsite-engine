import type { EnrollTotpResult } from "@/lib/auth/mfa";

/**
 * DÜZELTME (Vercel runtime error, ilk görülme 2026-08-25, teşhis
 * 2026-09-24): `MfaActionState`/`initialMfaActionState` önceden
 * mfa-actions.ts'te ("use server") tanımlıydı. Next.js bir "use server"
 * dosyasının SADECE async fonksiyon export etmesine izin veriyor —
 * `initialMfaActionState` bir sabit obje olduğu için (`MfaActionState`
 * interface'i sorun değil, tipler derleme zamanında zaten silinir),
 * /dashboard/settings her ziyaret edildiğinde modül değerlendirilirken
 * "A \"use server\" file can only export async functions, found object."
 * hatasıyla patlıyordu — build'i kırmıyor (statik analiz bunu yakalamıyor,
 * Next'in runtime action-manifest doğrulaması yakalıyor), ama sayfayı
 * çalışma zamanında kırıyordu.
 *
 * Bu, aynı kod tabanında zaten iki kez uygulanmış AYNI çözüm deseni:
 * lib/commerce/product-errors.ts (toFriendlyError, "use server"'dan sync
 * bir fonksiyon çıkarıldı) ve
 * products/[productId]/product-tab-keys.ts (isProductTabKey, "use
 * client"'tan server'ın çağırdığı bir fonksiyon çıkarıldı) — üçü de aynı
 * kural: bir server/client sınır dosyası SADECE o sınırın izin verdiği
 * şeyleri export edebilir, geri kalan her şey (tipler, sabitler, düz
 * yardımcı fonksiyonlar) sınırsız düz bir modülde yaşamalı.
 */
export interface MfaActionState {
  error: string | null;
  enrollment: EnrollTotpResult | null;
  enrolled: boolean;
}

export const initialMfaActionState: MfaActionState = { error: null, enrollment: null, enrolled: false };
