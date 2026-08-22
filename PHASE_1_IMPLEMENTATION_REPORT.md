# PHASE 1 — Uygulama Raporu
### MB Digital Boost Commerce Platform — Admin Panel Güvenlik + Mimari Sertleştirmesi

**Tarih:** 2026-08-22
**Kapsam:** PHASE_0_ADMIN_PLATFORM_AUDIT.md'nin kabul edilen bulgularının uygulanması (öncelik sırası: 1. Güvenlik, 2. Store/Tenant mimarisi, 3. Yetkilendirme, 4. Denetlenebilirlik, 5. Gelecekteki e-ticaret modülleri için temel).
**Durum:** Kod değişiklikleri tamamlandı, test edildi. **Git commit/push YAPILMADI** — kullanıcı onayı bekleniyor. **Veritabanı migration'ları (0005, 0006) yazıldı ama canlı Supabase projesine UYGULANMADI** — ayrıca bir onay gerekiyor (aşağıda §3 ve §10'da açıklanıyor).

---

## 1) Değiştirilen/Oluşturulan Dosyalar

### Yeni dosyalar
- `lib/security/safe-redirect.ts` — open-redirect koruması
- `components/seo/json-ld.tsx` — güvenli, tek JSON-LD render bileşeni
- `lib/validation/auth.ts` — login formu için zod şeması
- `lib/auth/mfa.ts` — Supabase MFA (TOTP) sarmalayıcıları
- `lib/auth/roles.ts` — RBAC rol-ailesi yardımcıları (isAdminRole/isStoreRole/isStoreWriteRole)
- `lib/auth/reauthenticate.ts` — şifre-yeniden-onay yardımcısı
- `app/(auth)/mfa-challenge/{page.tsx, actions.ts, mfa-challenge-form.tsx, form-state.ts}` — girişten sonra ikinci faktör ekranı
- `app/dashboard/settings/{mfa-actions.ts, mfa-section.tsx}` — MFA etkinleştir/kaldır arayüzü
- `supabase/platform/migrations/0005_expand_roles.sql` — RBAC genişlemesi (YAZILDI, UYGULANMADI)
- `supabase/platform/migrations/0006_stores.sql` — `stores` tablosu + RLS + Petra seed (YAZILDI, UYGULANMADI)

### Değiştirilen dosyalar
- `app/auth/callback/route.ts`, — open-redirect düzeltmesi
- `app/(public)/page.tsx`, `cozumler/[slug]/page.tsx`, `cerez-politikasi/page.tsx`, `kullanim-sartlari/page.tsx`, `gizlilik-politikasi/page.tsx`, `kvkk-aydinlatma-metni/page.tsx` — 7 XSS noktası → tek güvenli bileşen
- `app/(auth)/login/actions.ts` — rate limiting + audit log
- `lib/auth/audit-log.ts` — bayat "not called from anywhere" yorumu düzeltildi
- `lib/auth/sign-out-action.ts` — logout audit log
- `lib/supabase/types.ts` — `AppRole` genişletildi, `stores` tablosu şeması eklendi
- `lib/auth/get-memberships.ts`, `require-role.ts`, `require-admin.ts`, `require-customer-access.ts` — yeni rol ailelerini tanıyacak şekilde güncellendi; `requireCustomerWriteAccess()` eklendi
- `lib/validation/invite.ts` — rol enum'u + `currentPassword` alanı
- `app/dashboard/users/actions.ts`, `role-form.tsx`, `invite-form.tsx` — yeni rol isimleri + rol-değiştirme için şifre onayı
- `app/dashboard/layout.tsx` — AAL2 (MFA) zorunluluğu tek kontrol noktasında
- `app/dashboard/settings/page.tsx` — MFA bölümü eklendi
- 8 yazma action dosyası → `requireCustomerAccess` yerine `requireCustomerWriteAccess`: `leads/actions.ts`, `settings/actions.ts`, `content/hero/actions.ts`, `media/actions.ts`, `content/[type]/actions.ts`, `seo/actions.ts`, `tracking/actions.ts`, `lib/media/inline-image-upload-action.ts`

Bu liste, `git add` için hazırlanacak komutun TEK doğru kaynağı olmalı — repoda bu oturumdan önceki, ilgisiz, henüz commit'lenmemiş başka değişiklikler de var (ör. "Hakkımızda" sayfası revizyonu, referans geçiş animasyonu); onlar bu Phase'in parçası değil ve `git add -A` ile YANLIŞLIKLA dahil edilmemeli.

---

## 2) Yapılan Güvenlik Düzeltmeleri

- **H1 — Open redirect (`/auth/callback`):** `next` parametresi artık `resolveSafeNextPath()` ile doğrulanıyor; sadece aynı origin'e ait, göreli bir path'i kabul ediyor. `//evil.com`, `https://evil.com`, `/@evil.com`, `/evil.com:1234` gibi 11 saldırı senaryosu bağımsız bir script ile test edildi — hepsi `/dashboard`'a düşüyor (bkz. §9).
- **H2 — Login brute-force:** `loginAction` artık iki katmanlı rate limit uyguluyor (IP+e-posta: 5/15dk, sadece IP: 20/15dk). Limit aşılınca jenerik bir mesaj dönüyor ve `auth.login_rate_limited` olayı loglanıyor.
- **H3 — Stored XSS (JSON-LD):** 7 farklı yerde tekrarlanan, kaçırılmamış `JSON.stringify()` → `dangerouslySetInnerHTML` deseni tek bir `<JsonLd>` bileşeninde birleştirildi; `<` karakteri `<` olarak kaçırılıyor. `grep` taraması bu bileşen dışında sıfır kullanım olduğunu doğruladı.
- **Yeni bulgu — TOTP challenge brute-force:** MFA eklenirken fark edildi: 6 haneli bir TOTP kodu rate limit olmadan brute-force'a açık olurdu. `/mfa-challenge` de aynı limitleyiciyle korunuyor (5/15dk, kullanıcı başına).
- **Yeni bulgu — rol yükseltme onaysız yapılabiliyordu:** `changeUserRoleAction` (bir kullanıcıya platform admin yetkisi verme/alma) artık admin'in kendi şifresini yeniden girmesini istiyor (`reauthenticateWithPassword`). Bilinçli olarak SADECE bu en riskli action'a bağlandı.

---

## 3) Veritabanı/Migration Değişiklikleri

İki yeni migration dosyası **yazıldı ve iki kez elle gözden geçirildi**, ama canlı Platform Supabase projesine **UYGULANMADI**:

- **`0005_expand_roles.sql`** — `app_role` enum'unu `admin/customer`'dan `super_admin/platform_admin/store_admin/store_editor/store_viewer`'a genişletiyor. Mevcut 2 gerçek hesabı davranış değişmeden taşıyor (`admin→platform_admin`, `customer→store_admin`). `is_platform_admin()`/`is_customer_member()` fonksiyonları hem eski hem yeni etiketleri tanıyacak şekilde güncelleniyor — **geriye dönük uyumlu**, mevcut hiçbir yetkiyi bozmaz.
- **`0006_stores.sql`** — Commerce Platform'un temeli: `stores` tablosu (id, customer_id, name, slug, status, supabase_connection_key nullable) + RLS (customers/websites ile birebir aynı desen) + Petra için TEK gerçek satır (customer_id `55bf2f5c-5ac9-4d9e-9e9a-8b8f153ee81d`, connection_key `PETRA` — ikisi de bu oturumda canlı DB'den doğrulandı, uydurulmadı). Ürün/sipariş/ödeme tablosu YOK — kapsam dışı.

**Neden uygulanmadı:** Bu migration'lar gerçek admin/customer hesaplarının RLS davranışını ve rol etiketlerini değiştiriyor — bu, git commit/push'tan bağımsız, AYRI bir onay gerektiren bir canlı-sistem değişikliği. Kullanıcının "commit/push'tan önce onayımı bekle" talimatını aynı ihtiyatla veritabanına da uyguluyorum. **Onaylandığında** iki yoldan biriyle uygulanabilir: (a) bu oturumdan `mcp__Supabase__apply_migration` ile, ya da (b) kullanıcının kendi Supabase SQL Editor'ünden dosyaları sırayla çalıştırarak.

---

## 4) Store/Tenant Mimarisi

`stores` tablosu, `websites` tablosundan KASITLI olarak ayrı: `websites` bir müşterinin CMS/marketing sitesini temsil ediyor, `stores` ileride ürün/sipariş/envanter tablolarının bağlanacağı, kavramsal olarak ayrı bir e-ticaret varlığı. Bugün Petra için ikisi aynı gerçek işi temsil ediyor ve bilinçli olarak iki ayrı satır olacak. Taktikalp46 için yeni bir Supabase projesi AÇILMADI — talimat gereği.

---

## 5) RLS Durumu

Migration 0004'teki `is_platform_admin()`/`is_customer_member()` fonksiyonları (Phase 0'da doğrulanmış) migration 0005'te genişletildi, davranışsal olarak DEĞİŞMEDİ. `stores` tablosu aynı RLS desenini kullanıyor. **Dürüstlük notu:** `store_viewer` rolünün "yazamaz" kuralının RLS karşılığı YOK — site içeriği ayrı bir müşteri Supabase projesinde, service-role anahtarıyla erişiliyor; tek uygulama noktası `requireCustomerWriteAccess()` (bkz. o dosyanın yorumu). Migration canlıya uygulanmadığı için yeni rol mantığı gerçek RLS üzerinde henüz test edilemedi (§9).

---

## 6) MFA Durumu

TOTP tabanlı iki adımlı doğrulama eklendi — **sıfır yeni npm bağımlılığı** (Supabase'in `enroll()` yanıtı zaten hazır bir SVG QR kod döndürüyor). Akış: `/dashboard/settings`'te etkinleştir → QR kodu okut → 6 haneli kodla onayla. Sonraki girişlerde, faktörü olan bir kullanıcı `app/dashboard/layout.tsx`'in tek kontrol noktasından `/mfa-challenge`'a yönlendiriliyor, kodu girmeden dashboard'un hiçbir sayfasını göremiyor. Kaldırma da mümkün. Bugün hiçbir gerçek hesap MFA'yı etkinleştirmedi — bu bir kod hazırlığı, kullanıcıların kendi seçimiyle açması gerekiyor.

---

## 7) Audit Log Durumu

`logAuditEvent()`'in "hiçbir yerden çağrılmıyor" diyen bayat yorumu düzeltildi (aslında 10+ yerden çağrılıyormuş — Phase 0'ın kendi bulgusu). Phase 1'de eklenen yeni olaylar: `auth.login_succeeded/failed/rate_limited`, `auth.logout`, `auth.mfa_enrollment_started/enrolled/disabled`, `auth.mfa_challenge_succeeded/failed/rate_limited`, `user.role_change_reauth_failed`. Hiçbir metadata alanına şifre/token/secret yazılmadı — sadece e-posta/rol/factorId gibi kimlik bilgileri.

---

## 8) Rate Limiting Durumu

Mevcut `lib/security/rate-limit.ts` (bellek-içi, tek-instance, Phase 0'da zaten dürüstçe belgelenmiş sınırlarıyla) üç yeni yerde yeniden kullanıldı: login (IP+e-posta VE sadece-IP, iki katman), MFA challenge (kullanıcı başına). Yeni bir bağımlılık eklenmedi.

---

## 9) Test Sonuçları

- `npx tsc --noEmit` → **0 hata**
- `npm run lint` → **0 hata, 0 uyarı**
- `npm run build` → **başarılı** (26 route, `/mfa-challenge` dahil, prerender/dynamic ayrımı doğru)
- Bağımsız script ile 3 güvenlik düzeltmesinin gerçek davranışı doğrulandı (kod incelemesinin ötesinde):
  - Open redirect: 11 senaryo (`//evil.com`, `https://evil.com`, `/@evil.com`, kontrol karakterleri, vb.) → hepsi güvenli fallback'e düştü.
  - JSON-LD XSS: `</script><script>alert(1)</script>` payload'ı kaçırıldıktan sonra literal `</script>` içermiyor VE orijinal veriye kayıpsız geri dönüyor.
  - Rate limiter: 5 istek kabul, 6. istek doğru şekilde reddedildi.
- **Test edilemeyen/eksik kalan senaryolar (dürüstçe belirtilmeli):**
  - Cross-store data leak / URL-manipulation ile başka mağazaya erişim: migration 0005/0006 canlıya uygulanmadığı için YENİ rol mantığı gerçek Postgres RLS üzerinde test edilemedi. Migration geriye dönük uyumlu tasarlandığı (eski `admin`/`customer` etiketleri hâlâ tanınıyor) için mevcut yetkilerin bozulmayacağı YAPISAL olarak garanti, ama bu bir canlı test değil.
  - Login/MFA brute-force: gerçek bir hesapla canlı curl testi yapılmadı (yeni bir Supabase Auth hesabı açmam yasak, gerçek hesapların şifresini bilmiyorum) — bunun yerine rate limiter'ın matematiği izole test edildi.
  - Secret-in-client-bundle: kod incelemesiyle doğrulandı (yeni "use client" dosyaları sadece Server Action'ları ve `type`-only import'ları kullanıyor), bundle analizi çalıştırılmadı.

---

## 10) Çözülmemiş Riskler

- **Migration'lar canlıya uygulanmadı** — onay bekleniyor (§3).
- `store_editor`/`store_viewer` rolleri şemada hazır ama hiçbir davet/rol formu bunları üretmiyor — Phase 2'nin mağaza yönetim UI'ı ile gelecek.
- `store_viewer`'ın "yazamaz" kuralının gerçek bir RLS karşılığı yok (§5) — ileride müşteri Supabase projelerine platform-rolü bilgisini taşıyan bir mekanizma (ör. imzalı bir JWT claim) olmadan bu her zaman sadece uygulama-katmanı bir kontrol olarak kalacak.
- MFA unenroll işlemi şifre onayı istemiyor (bilinçli kapsam daraltması — sadece rol değişikliğine bağlandı).
- "Test Kullanıcı 3" adlı sahte lead satırı ve "TÜRKMEN ŞİRKETLER GRUBU" adı hâlâ doğrulanmamış durumda — Phase 0'dan kalma, bu faza dahil değil.
- Rate limiter hâlâ tek-instance/bellek-içi (Phase 0'da belgelenmiş bilinen sınır) — gerçek trafik/çoklu-instance ölçeğinde Upstash Redis gibi dağıtık bir çözüme geçiş önerisi hâlâ geçerli.

---

## 11) Sonraki Faz Önerisi

Phase 2: (a) migration 0005/0006'nın onaylanıp uygulanması, (b) mağaza yönetim UI'ı (stores CRUD, store_editor/store_viewer atama arayüzü), (c) Taktikalp46'nın gerçek verileriyle ilk store kaydının oluşturulması, (d) müşteri/store hard-delete akışının KVKK-uyumlu tasarımı (Phase 0'ın "cross-project PII orphan" bulgusu).
