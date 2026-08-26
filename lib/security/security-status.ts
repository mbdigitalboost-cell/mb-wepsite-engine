/**
 * SECURITY CENTER FOUNDATION (bkz. PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md
 * §9). Bu dosya bir UI/dashboard DEĞİL — hiçbir route/component tarafından
 * import EDİLMİYOR, hiçbir yere bağlanmıyor. Amacı, gelecekte gerçek bir
 * "Security Center" ekranı kurulacağı zaman ihtiyaç duyulacak VERİ ŞEKLİNİ
 * ve MEVCUT gerçek durumu şimdiden, dürüstçe kayıt altına almak.
 *
 * KATI KURAL: bir kategori SADECE gerçekten çalıştırılmış bir test/inceleme
 * varsa "pass" olabilir. "Henüz test edilmedi" veya "kısmen doğrulandı"
 * durumları AÇIKÇA "not_tested"/"partial" olarak işaretlenir — sahte
 * "green" ÜRETİLMEZ. Her satır, o durumun NEREDE (hangi rapor/bölüm)
 * doğrulandığını `evidence` alanında gösterir; iddia edip kaynak
 * göstermeyen bir satır bu dosyaya EKLENMEMELİ.
 *
 * Bu bir "canlı" durum değil — statik bir kayıt defteri. Kodun kendisi
 * değiştiğinde (yeni bir action, yeni bir RLS policy, bir dependency
 * güncellemesi) bu dosyanın YENİDEN gözden geçirilip güncellenmesi GEREKİR;
 * otomatik olarak kendini güncellemez.
 */

export type SecurityCheckStatus = "pass" | "partial" | "fail" | "not_applicable" | "not_tested";

export interface SecurityCheckRecord {
  category: string;
  status: SecurityCheckStatus;
  summary: string;
  /** Hangi rapor(lar)/bölüm(ler) bu durumu destekliyor — iddia değil, kanıt. */
  evidence: string[];
  /** ISO tarih — bu satırın en son ne zaman gerçekten doğrulandığı. */
  lastVerifiedAt: string;
}

export const SECURITY_CHECK_REGISTRY: readonly SecurityCheckRecord[] = [
  {
    category: "Authentication",
    status: "partial",
    summary:
      "Login/logout/session/open-redirect PASS (PHASE_2_FINAL_SECURITY_REVIEW.md §6). AAL2 Server Action gate'i bu turda eklendi ama gerçek Supabase Auth (GoTrue) oturumuyla uçtan uca DOĞRULANMADI — bkz. MFA satırı.",
    evidence: [
      "PHASE_2_FINAL_SECURITY_REVIEW.md §6 (Auth/MFA results)",
      "PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §5/§8",
    ],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "MFA",
    status: "partial",
    summary:
      "requireAal2() merkezi gate'e eklendi, karar mantığı (needsMfaChallenge) yerel bir mantık testiyle doğrulandı. Gerçek AAL1->AAL2 Server Action reddi/izni bu sandbox'ta ÇALIŞTIRILAMADI (GoTrue/Docker yok) — staging'de gerçek Supabase Auth API'siyle doğrulanmalı.",
    evidence: [
      "PHASE_2_CRITICAL_REMEDIATION_PLAN.md §8, §12 (TEST 5-7)",
      "PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §5, §8",
    ],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "RBAC",
    status: "pass",
    summary:
      "store_viewer/store_editor/store_admin/platform_admin ayrımı canlı RLS testleriyle (Final Review) ve bu turdaki yerel harness testleriyle (TEST 1/5/6) doğrulandı.",
    evidence: [
      "PHASE_2_FINAL_SECURITY_REVIEW.md §1, §2",
      "PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §4 (TEST 1, 5, 6)",
    ],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "RLS",
    status: "pass",
    summary:
      "store_navigation_menus/items için composite FK + mevcut RLS policy'leri, üretim şemasının birebir kopyası bir yerel Postgres harness'ında TEST 1-10 ile doğrulandı.",
    evidence: ["PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §4"],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "Tenant Isolation",
    status: "pass",
    summary:
      "CRITICAL cross-tenant navigation injection (menu_id/store_id) composite FK ile kapatıldı; TEST 2/2b/3/4/8 ile hem yazma hem okuma yönünde izolasyon doğrulandı.",
    evidence: ["PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §2, §4"],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "Rate Limiting",
    status: "partial",
    summary:
      "Login ve MFA challenge rate limiting mevcut/PASS (değişmedi). changeUserRoleAction/setStoreMaintenanceModeAction'ın reauth adımı HÂLÂ rate-limitsiz (MEDIUM M2) — bu remediation turunun kapsamında BİLİNÇLİ OLARAK ele alınmadı.",
    evidence: ["PHASE_2_FINAL_SECURITY_REVIEW.md §6", "PHASE_2_CRITICAL_REMEDIATION_PLAN.md §8"],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "XSS Protection",
    status: "pass",
    summary:
      "JSON-LD escaping pre-existing/PASS. Navigation url + homepage linkUrl/secondaryCtaHref artık allowlist (isSafeNavigationUrl) ile korunuyor, 26/26 test vektörü (bilinen tehlikeli şemalar + encode edilmiş varyantlar) bu turda PASS.",
    evidence: ["PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §3"],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "Webhook Security",
    status: "not_applicable",
    summary: "Bu codebase'de henüz hiçbir webhook endpoint'i/işlevi yok — değerlendirilecek bir yüzey yok.",
    evidence: ["PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §10 (Remaining risks)"],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "Secret Management",
    status: "pass",
    summary: ".env.local gitignored, sadece placeholder .example tracked, NEXT_PUBLIC_* sadece güvenli alanları içeriyor. Bu turun diff'i ayrıca tarandı, sızdırılmış bir secret değeri bulunmadı.",
    evidence: ["PHASE_2_FINAL_SECURITY_REVIEW.md §13", "PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §8"],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "Dependency Security",
    status: "partial",
    summary:
      "Next.js 16.3.3'e (2 kritik güvenlik açığını düzelten acil sürüm) yükseltildi, `npm audit` 0 açık bildiriyor. İki CVE'nin tam teknik advisory metni bu oturumda HENÜZ bağımsız olarak doğrulanamadı (yayın anındaki kısıtlama) — production'a geçmeden tekrar kontrol edilmeli.",
    evidence: ["PHASE_2_CRITICAL_REMEDIATION_IMPLEMENTATION_REPORT.md §7"],
    lastVerifiedAt: "2026-08-25",
  },
  {
    category: "Audit Logging",
    status: "partial",
    summary:
      "Kritik işlem kapsamı ve PII-sızıntısı-yok PASS. customerId'nin DB-doğrulanmamış olması (MEDIUM M1) bu turda DÜZELTİLMEDİ — bilinçli kapsam dışı bırakıldı.",
    evidence: ["PHASE_2_FINAL_SECURITY_REVIEW.md §7", "PHASE_2_CRITICAL_REMEDIATION_PLAN.md §1"],
    lastVerifiedAt: "2026-08-25",
  },
] as const;
