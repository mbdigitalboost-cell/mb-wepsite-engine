import "server-only";

import { redirect } from "next/navigation";
import { getAalStatus, needsMfaChallenge } from "@/lib/auth/mfa";

/**
 * PHASE 2 CRITICAL REMEDIATION (CRITICAL 2 — bkz.
 * PHASE_2_CRITICAL_REMEDIATION_PLAN.md §7-8, PHASE_2_FINAL_SECURITY_REVIEW.md
 * §6). `requireSession()`'ın AAL2 karşılığı — AYNI desen (redirect, throw
 * değil).
 *
 * KÖK NEDEN (düzeltilen): AAL2 kontrolü ÖNCEDEN SADECE
 * `app/dashboard/layout.tsx`'te vardı. Next.js'in kendi resmi
 * dokümantasyonu (docs/01-app/02-guides/data-security.mdx, Context7 ile
 * doğrulandı) açıkça uyarıyor: bir layout'taki kontrol Server Action'ları
 * KORUMAZ — her "use server" fonksiyonu kendi başına bağımsız bir HTTP
 * endpoint'i olduğu için, layout'un render edilmesini hiç gerektirmeden
 * doğrudan çağrılabilir. Bu fonksiyon o boşluğu, action'ların ZATEN
 * çağırdığı merkezi gate'lerin (`requireStoreAdminAccess`, `requireAdmin`)
 * İÇİNE eklenerek kapatıyor — "her action'a ayrı ayrı MFA kontrolü" YOK,
 * DAL (Data Access Layer) deseniyle TEK bir merkezi kontrol noktası.
 *
 * SADECE MFA'yı GERÇEKTEN kaydetmiş (verified factor'ı olan) kullanıcıları
 * etkiler: `needsMfaChallenge()` zaten "nextLevel==='aal2' &&
 * currentLevel!=='aal2'" demek — yani MFA'sı olmayan bir kullanıcı için bu
 * her zaman false döner. Bu, Supabase Auth'un kendi sunucu tarafı
 * davranışıyla AYNI (Context7 ile bu turda doğrulanan supabase/auth kaynak
 * kodu, internal/api/user.go: "if user.HasMFAEnabled() && !session.IsAAL2()"
 * — AAL2 zorunluluğu SADECE MFA kayıtlı kullanıcılar için tetiklenir).
 *
 * BİLİNÇLİ SINIR (residual, CRITICAL 2'nin kapsamı DIŞINDA — bkz. plan
 * §8): hiç MFA kaydetmemiş bir platform_admin/store_admin için bu kontrol
 * HİÇBİR ZAMAN engellemez (bugünkü davranışla AYNI). MFA'yı ZORUNLU kılmak
 * ayrı bir mimari karar/onay gerektirir, bu remediation'ın kapsamında
 * DEĞİL.
 *
 * NEREYE EKLENİR / EKLENMEZ (Authorization Level Matrix, plan §9):
 *   - `requireStoreAdminAccess()` (Level 3) ve `requireAdmin()` (Level 4)
 *     İÇİNE eklenir — `requireSession()`'dan HEMEN SONRA, herhangi bir
 *     veri sorgusundan ÖNCE.
 *   - `requireStoreAccess()`/`requireStoreEditorAccess()` (Level 1/2,
 *     geri alınabilir okuma/içerik-düzenleme) İÇİNE EKLENMEZ — kullanıcının
 *     "her action'a körü körüne MFA ekleme" talimatına uygun.
 *   - `requireCustomerAccess()`/`requireCustomerWriteAccess()` (Phase 1,
 *     Level 1/2 muadili — okuma ve normal içerik yazma) İÇİNE de EKLENMEZ,
 *     aynı gerekçeyle.
 */
export async function requireAal2(): Promise<void> {
  const status = await getAalStatus();
  if (needsMfaChallenge(status)) {
    redirect("/mfa-challenge");
  }
}
