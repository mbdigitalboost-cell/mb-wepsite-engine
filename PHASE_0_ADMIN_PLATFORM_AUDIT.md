# PHASE 0 — MB Digital Boost Commerce Platform: Admin Panel Mimarisi + Güvenlik Audit

**Tarih:** 2026-08-22
**Kapsam:** Salt okunur analiz. Hiçbir dosya değiştirilmedi, hiçbir migration/SQL yazma işlemi yapılmadı, hiçbir commit/push yapılmadı, hiçbir Supabase verisi değiştirilmedi.
**Yöntem:** Kod tabanı doğrudan okunarak + Supabase MCP ile canlı Platform DB (`wnedgbbyqpvylfiwkwen` / `mb-digital-platform`) ve Petra Customer DB (`wahbjfhvizalenyxjywb` / `petra mühendislik`) üzerinde SADECE SELECT sorguları çalıştırılarak yapıldı. 5 paralel derinlemesine inceleme (RLS/tenant izolasyonu, route/server-action envanteri, OWASP taraması, veritabanı şeması, multi-tenant mimari değerlendirmesi) + doğrudan dosya incelemesi birleştirildi.
**Not:** Hiçbir gerçek secret/API key değeri bu raporda yer almıyor — yalnızca hangi dosyada/nasıl kullanıldığı belirtiliyor.

---

## 1. Executive Summary

Mevcut admin paneli, "çöpe atılıp yeniden yapılması gereken" bir taslak değil — **sağlam bir temel**. İki katmanlı bir çok-kiracılılık modeli var: (a) ajans seviyesinde tek bir "Platform" Supabase projesi (kim hangi müşteriye erişebilir), (b) her müşteri için tamamen ayrı, fiziksel olarak izole bir "customer" Supabase projesi (o müşterinin gerçek içerik/lead verisi). Bu modelin güvenlik mantığı (`is_customer_member()` fonksiyonu, `requireCustomerAccess()` uygulama katmanı kısayolu) bağımsız olarak doğrulandı ve doğru çalışıyor.

26 server action + 22 sayfa + 2 API route'unun tamamı incelendi: **hiçbir yerde eksik/unutulmuş bir yetkilendirme kontrolü bulunamadı.** Zod validasyonu 11/12 action'da var. Secret/anon-key ayrımı temiz, RLS her iki projede de %100 tablo kapsamında açık, migration'lar canlı ile birebir tutarlı.

Buna karşılık **3 gerçek, bugün sömürülebilir açık** bulundu (open redirect, login brute-force koruması yokluğu, CMS alanından JSON-LD'ye kaçırılmamış stored XSS) ve **MFA'nın tamamen eksik olması** gerçek parayla çalışacak bir platform için ticari işlemler başlamadan önce mutlaka kapatılması gereken bir boşluk. Ayrıca mimarinin en kırılgan noktası — service-role client kullanan iki fonksiyonun (`loadCustomerConnection`, `inviteUser`) yetki kontrolünü kendi içinde değil çağıranın disiplinine bırakması — bugün sömürülemez ama commerce'e geçerken (daha fazla developer/AI-agent hızlı kod eklerken) gerçek bir cross-tenant IDOR'a dönüşme potansiyeli taşıyor.

**"Her müşteri = ayrı Supabase projesi" modeli Petra için doğruydu ama çok sayıda küçük e-ticaret mağazası (Taktikalp46 ve sonrası) için ölçeklenmez** — maliyet ve operasyonel karmaşıklık doğrusal değil, süper-doğrusal büyür. Bu, Faz 1'in en önemli mimari kararı olmalı.

---

## 2. Existing Architecture

```
MB Digital Boost Website Engine (Next.js 16 App Router)
│
├── Platform Supabase (tek proje, id: wnedgbbyqpvylfiwkwen, ACTIVE_HEALTHY)
│   ├── profiles          — Supabase Auth kullanıcılarının aynası (trigger ile otomatik)
│   ├── customers         — ajans müşterileri (şu an: 1 satır, "Petra Mühendislik")
│   ├── websites          — müşteri başına site kaydı, supabase_connection_key ile
│   │                        müşterinin KENDİ Supabase projesine işaret eder
│   ├── customer_users    — kim hangi role/müşteriye sahip (admin: customer_id NULL,
│   │                        customer: customer_id zorunlu — DB constraint ile zorlanıyor)
│   └── audit_logs        — service-role only, INSERT policy'si anon/authenticated'a yok
│
└── Her müşteri için AYRI bir "customer" Supabase projesi
    (Petra: id wahbjfhvizalenyxjywb, ACTIVE_HEALTHY)
    ├── site_settings, pages, hero_sections, services, solutions,
    │   projects, campaigns, testimonials, faqs, seo_settings,
    │   tracking_settings, navigation_items   — CMS içeriği (status=draft/published)
    ├── media_assets                           — Storage'daki dosyaların metadata'sı
    └── leads                                  — form gönderimleri (KVKK kapsamında PII)
```

Bağlantı zinciri `lib/cms/connection.ts` üzerinden: `connectionKey` (örn. `"PETRA"`) önce Platform DB'de `websites.supabase_connection_key` + `status="active"` ile doğrulanıyor, sonra `SUPABASE_URL_<KEY>` / `SUPABASE_ANON_KEY_<KEY>` / `SUPABASE_SERVICE_ROLE_KEY_<KEY>` env değişkenleri okunuyor.

**Önemli düzeltme (bu audit sırasında ortaya çıktı):** Projenin önceki durum belgesi "gerçek bir Supabase projesi yok" diyordu — bu yanlıştı. Gerçekte her iki proje de 2026-08-15'ten beri var ve sağlıklı; sadece customer DB'deki TÜM içerik satırları `status="draft"` olduğu için `fetchPublishedList` (yalnızca `published` çeken fonksiyon) hiçbirini döndürmüyor ve public site hâlâ statik `lib/data/petra/*.ts` dosyalarından besleniyor. Sonuç olarak "site statik veriyle çalışıyor" gözlemi doğruydu, sebebi yanlış anlaşılmıştı.

---

## 3. Admin Panel Architecture

```
app/dashboard/                              (tek choke-point: layout.tsx → requireSession())
├── page.tsx                                — role'e göre dallanan ana ekran
├── customers/
│   ├── page.tsx, new/page.tsx              — admin-only müşteri listesi/oluşturma
│   └── [customerId]/
│       ├── page.tsx                        — müşteri detay (requireCustomerAccess)
│       ├── websites/{new,[websiteId]}      — admin-only website yönetimi
│       ├── content/{hero,[type],page}      — requireCustomerAccess, 6 jenerik içerik tipi
│       ├── leads/page.tsx                  — lead durumu yönetimi
│       ├── media/page.tsx                  — Storage medya yönetimi
│       ├── seo/page.tsx, settings/page.tsx, tracking/page.tsx
├── settings/page.tsx                       — kullanıcının kendi hesap ayarları
├── users/page.tsx                          — admin-only kullanıcı davet/rol yönetimi
└── websites/page.tsx                       — admin-only tüm site'lar listesi

app/(auth)/login/  +  app/auth/{callback,set-password}/   — kimlik doğrulama akışı
```

Yetkilendirme üç katmanlı: `requireSession()` (giriş var mı) → `requireRole()`/`requireAdmin()` (rol var mı) → `requireCustomerAccess(customerId)` (bu müşteriye özel mi) — hepsi `lib/auth/` altında, hepsi UYGULAMA seviyesi hızlı-red katmanı; GERÇEK sınır Platform RLS'teki `is_customer_member()`.

---

## 4. Authentication Audit

| Konu | Durum | Değerlendirme |
|---|---|---|
| Giriş yöntemi | E-posta + şifre (`supabase.auth.signInWithPassword`) | Tek faktörlü |
| Hata mesajları | Jenerik "E-posta veya şifre hatalı" | ✅ Account enumeration önleniyor |
| **Rate limiting (login)** | **YOK** | 🔴 **High** — sınırsız brute-force/credential-stuffing denemesi mümkün |
| Şifre belirleme/değiştirme | `setPasswordAction` — sadece kendi session'ının şifresini değiştirir, `updateUser()` üzerinden | ✅ Admin başkasının şifresini asla göremez/belirleyemez |
| Davet akışı | `inviteUser()` → Supabase Auth'un `admin.inviteUserByEmail` | Fonksiyonun kendisi yetki kontrolü yapmıyor, tek çağıranı (`inviteUserAction`) `requireAdmin()` ile korunuyor (bkz. §17 M2) |
| Session/cookie | `@supabase/ssr`'ın `createServerClient` + `getAll/setAll` adaptörü, hiçbir custom `sameSite`/`secure`/`httpOnly` override'ı yok | ✅ Kütüphane varsayılanına güveniliyor, doğru |
| Session yenileme | `lib/supabase/proxy.ts`'de `updateSupabaseSession` var ve çalışıyor | ⚠️ `lib/supabase/server.ts` yorumunda "middleware'de de yenileniyor" deniyor ama kök dizinde ayrı bir `middleware.ts` yok — proxy dosyasının bu görevi gördüğü doğrulandı, sadece yorum güncel değil (Low) |
| Logout | `lib/auth/sign-out-action.ts` — sadece kendi cookie'sini temizler | ✅ |
| **MFA/2FA** | **Hiç yok** — `mfa/totp/2fa/otp` için tüm kod tabanında sıfır eşleşme | 🟠 **Gap** — ödeme öncesi mutlaka eklenmeli, en azından admin hesapları için |
| Leaked password protection (Supabase Auth ayarı) | Kapalı (Supabase advisor uyarısı) | 🟡 Medium — açılması önerilir (ücretsiz, tek tıkla) |
| Callback route güvenliği | `app/auth/callback/route.ts` — **açık redirect açığı** | 🔴 **High**, bkz. §16 H1 |

---

## 5. Authorization / RBAC Audit

Model: `customer_users(role: admin|customer, customer_id)`. `role='admin'` → `customer_id NULL` (admin her müşteriye erişir), `role='customer'` → `customer_id` zorunlu tek bir müşteriye scope'lu. Bu ayrım DB seviyesinde bir CHECK constraint ile de zorlanıyor — yalnızca uygulama koduna güvenilmiyor.

**İncelenen 26 server action + 22 sayfanın TAMAMINDA** doğru gate (`requireSession`/`requireRole`/`requireAdmin`/`requireCustomerAccess`) çağrılıyor — envanter tablosu için bkz. §8 ve §9. Hiçbir "unutulmuş gate" bulunamadı.

**Defense-in-depth zayıf noktaları (bugün sömürülemez, mimari kırılganlık):**
- `loadCustomerConnection()` / `resolveConnectionKeyForCustomer()` (`lib/cms/resolve-customer-connection.ts`, `lib/cms/dashboard/require-customer-connection.ts`) kendi içlerinde yetki kontrolü yapmıyor — herhangi bir `customerId` için RLS'i bypass eden service-role client döndürüyorlar. Güvenlik tamamen "çağıran önce `requireCustomerAccess()` çağırmış olmalı" disiplinine dayanıyor. 30 çağrı yerinin TAMAMI bugün doğru sırada (grep ile doğrulandı), ama tip sistemi bunu zorlamıyor. **(Bulgu M1, §17)**
- `inviteUser()` (`lib/auth/invite-user.ts`) aynı desende — kendi içinde admin kontrolü yok, tek çağıranı gate'li. **(Bulgu M2, §17)**

---

## 6. Supabase / RLS Audit

| | Platform DB | Petra Customer DB |
|---|---|---|
| Tablo sayısı | 5 | 14 |
| RLS açık tablo | 5/5 (%100) | 14/14 (%100) |
| Toplam policy | 15 | 12 |
| Migration ↔ canlı tutarlılık | ✅ Tam eşleşme | ✅ Tam eşleşme |
| Security advisor uyarısı | 10 (WARN) | 3 (1 ERROR, 2 INFO) |

**`is_customer_member()` fonksiyonu bağımsız olarak doğrulandı:** canlıdan çekilen tanım, `require-customer-access.ts`'in iddia ettiği "admin her zaman geçer, customer sadece kendi customer_id'sine sahipse geçer" mantığını doğru uyguluyor.

**Bulgular:**
- 🟡 **Medium** — `tracking_public_settings` view'ı `SECURITY DEFINER` ile tanımlı (Supabase advisor: ERROR seviyesi). Şu an sadece 3 zararsız sütun (`ga4_id, gtm_id, meta_pixel_id`) açık isim isim seçiliyor, `meta_capi_token` dahil değil — bugün sızıntı yok, ama view tanımı ileride `select *`'e değiştirilirse token sızabilir. Alternatif: `security_invoker=true` + dar bir RLS policy.
- 🟢 **Info/Pozitif** — `leads`, `tracking_settings` gibi hassas tablolarda hiç anon/authenticated policy'si yok → RLS'in "policy yoksa tam red" kuralı gereği tamamen kapalı, sadece service-role erişebiliyor. Doğrulandı, doğru.
- 🟢 **Info** — `seo_settings_public_select` ve `media_assets_public_select` policy'leri `true` ile herkese açık ama içerik zaten hassas değil (SEO metası, medya metadata'sı) — risk değil.
- 🟡 **Medium** — Supabase Auth'ta "Leaked Password Protection" kapalı.
- Storage: Petra projesinde tek bucket `media` (public=true, 5MB limit, sadece image MIME'ları — `image/svg+xml` dahil, bkz. §14 madde 5). Platform DB'de hiç bucket yok (beklenen).
- Kurulu extension seti minimal ve uygun: `pgcrypto`, `pg_stat_statements`, `supabase_vault`, `uuid-ossp`, `plpgsql` — `pg_net`/`http`/`dblink` gibi SSRF'e açık olabilecek extension'lar kurulu DEĞİL. ✅

---

## 7. Database Audit

- Platform DB: 34 kolon, 6 FK, 20 index. Customer DB: ~120 kolon, 2 FK, 40 index. **FK kolonlarında index eksikliği bulunamadı** — her tenant-scoping kolonu (customer_id, user_id, page_id) kendi index'ine sahip.
- `customer_users` üzerinde iki kısmi-unique index rol modelini DB seviyesinde de zorluyor (iyi tasarım).
- **🔴 High — Orphan-data riski:** `customers` silindiğinde Platform DB içi CASCADE (websites, customer_users) tutarlı çalışıyor, ama müşterinin GERÇEK verisini tutan ayrı customer-Supabase-projesi bu CASCADE'in erişemeyeceği bir yerde — silinirse referans kaybolur, veri (leads dahil PII) hiçbir iz bırakmadan yetim kalır. Bugün UI'da hard-delete action'ı yok (`setCustomerStatusAction` sadece deactivate ediyor, kasıtlı) — yani risk bugün tetiklenemez, ama gelecekte bir "mağaza sil" özelliği eklenirse mutlaka customer-DB temizliğini de tetikleyen bir orkestrasyon adımı olmalı.
- 🟡 **Medium** — `websites_customer_id_fkey` CASCADE: gelecekte çoklu-website müşteriler için tehlikeli olabilir (bir customer silinirse TÜM website kayıtları sessizce gider).
- 🟢 **Low** — `hero_sections.page_id` (SET NULL) ile `seo_settings.page_id` (CASCADE) arasında tutarsız silme semantiği — muhtemelen kasıtlı ama dokümante edilmemiş.
- `leads` KVKK değerlendirmesi: 0 RLS policy + RLS açık = anon/authenticated için tam red, sadece service-role erişebiliyor. Doğrulandı, doğru model. Tek güvenlik sınırı artık service-role anahtarının gizliliği.

---

## 8. Admin Route Audit

| Route | Gate |
|---|---|
| `/dashboard` | `loadRoleContext()` (role'e göre dallanır) |
| `/dashboard/customers`, `/customers/new` | `requireAdmin()` |
| `/dashboard/customers/[customerId]` ve altındaki content/leads/media/seo/settings/tracking | `requireCustomerAccess(customerId)` |
| `/dashboard/customers/[customerId]/websites/*` | `requireAdmin()` |
| `/dashboard/settings` | `requireSession()` (sadece kendi hesabı) |
| `/dashboard/users`, `/dashboard/websites` | `requireAdmin()` |
| `/login` | Gate yok (pre-auth, kasıtlı) — zaten girişliyse `/dashboard`'a yönlendiriyor |
| `/auth/set-password` | `requireSession()` |
| `/auth/callback` | Gate yok (session'ı bu route kuruyor) — **§16 H1 açık redirect burada** |

Tüm `[type]` dinamik route'ları (`content/[type]/*`) bir `isContentTypeKey()` whitelist kontrolüyle dinamik tablo adı enjeksiyonuna karşı korunuyor.

---

## 9. API / Server Action Audit

| Route/Action | Auth | Validasyon | Not |
|---|---|---|---|
| `POST /api/forms/discovery-request` | Yok (bilinçli, public form) | zod + honeypot | Rate limit VAR (IP başına 10dk/5) |
| `GET /api/health/supabase` | Yok | — | Sadece public env + generic hata döner, gerçek secret yok (Low/Info) |
| 14 adet `app/dashboard/**/actions.ts` (customers, users, websites, media, content, leads, settings, seo, tracking) | Her biri `requireAdmin()`/`requireCustomerAccess()` | 11/14 zod şeması kullanıyor | `login/actions.ts` zod kullanmıyor (Low) |
| `lib/media/inline-image-upload-action.ts` | `requireCustomerAccess` | MIME/boyut/klasör whitelist | SVG whitelist'te, sanitize yok (Medium) |
| `lib/auth/sign-out-action.ts` | Gerek yok (kendi cookie'si) | — | — |

`createSupabaseAdminClient` (service-role) kullanılan 6 konumun TAMAMI ya doğrudan bir gate'in içinde ya da hiç client-kontrollü ID almıyor — tek istisna M1/M2 (kendi içinde kontrolü olmayan ama tek çağıranı gate'li 2 fonksiyon).

---

## 10. Secret Security Audit

- `SERVICE_ROLE`/`service_role` deseni yalnızca 4 sunucu-taraflı dosyada geçiyor (`lib/config/env.ts`, `lib/supabase/admin.ts`, `lib/cms/connection.ts`, `lib/cms/customer-types.ts` yorum) — hiçbiri `"use client"` değil, `server-only` paketiyle build-time korumalı.
- `serverEnv.*` bir Client Component'e prop olarak geçirildiği hiçbir yerde bulunamadı.
- `next.config.ts`'de ek bir env-exposure ayarı yok, Next'in `NEXT_PUBLIC_*` varsayılanına güveniliyor — doğru.
- `.env.local` git'e track edilmemiş (`.gitignore` içinde `.env*` + `.env.local.example` istisnası); `git ls-files` bunu doğruluyor.
- **Öneri:** CI'a bir secret-scanning hook'u (gitleaks/truffleHog) eklenmesi — bugün yok.

---

## 11. Storage Audit

- Platform DB: hiç bucket yok (beklenen, bu proje dosya barındırmıyor).
- Petra DB: tek bucket `media`, `public=true`, 5MB limit, MIME whitelist (jpeg/png/webp/**svg+xml**/gif).
- Dosya adı sanitize ediliyor (`lib/media/upload-customer-image.ts`): küçük harf + `[^a-z0-9-_]` temizliği + 80 karakter kırpma + `crypto.randomUUID().slice(0,8)` sonek — path traversal/collision riski yok.
- Klasör (`folder`) bir whitelist'e karşı doğrulanıyor, tanınmayan değer güvenli bir varsayılana düşüyor.
- Tenant izolasyonu path'te değil (customerId path'e eklenmiyor) ama fiziksel proje ayrımı sayesinde bugün risk yok — **tek paylaşılan Storage projesine geçilirse bu MUTLAKA path/bucket bazlı RLS policy'sine dönüştürülmeli.**
- 🟡 **Medium** — `image/svg+xml` whitelist'te; SVG script içerebilir. Bugünkü kullanım (`<Image>`/`<img>` ile render) etkiyi sınırlıyor ama sanitize edilmemiş SVG kabul etmek risklidir.

---

## 12. Audit Log Audit

Beklenenin aksine (ve önceki durum belgesindeki "hiçbir yerden çağrılmıyor" notunun aksine) **`logAuditEvent()` fiilen 20 farklı çağrı noktasından aktif olarak kullanılıyor** — customer/website/content/media/lead/settings/seo/tracking/user CRUD'larının hemen hepsinde. `lib/auth/audit-log.ts` içindeki "Not called from anywhere yet" yorumu **güncel değil**, kafa karıştırıcı — temizlenmeli (Low).

**Kapsanmayan alanlar:**
- 🟡 **Medium** — Login/logout ve başarısız giriş denemeleri loglanmıyor.
- 🟡 **Medium** — `requireAdmin()`/`requireCustomerAccess()`'in reddettiği yetkisiz erişim denemeleri (ör. bir customer'ın başka customer'ın verisine erişmeye çalışması) loglanmıyor — güvenlik olayı izlenebilirliği için önemli bir boşluk.
- 🟢 Low — `setPasswordAction` (kendi şifre değişikliği) loglanmıyor.

`audit_logs` tablosunda şu an 1 satır var (veritabanı çok taze, tek müşteri/az aktivite — kullanılmadığının değil, düşük hacmin göstergesi).

---

## 13. Multi-Tenant Readiness

**Bugünkü model ("her müşteri = ayrı Supabase projesi") az sayıda büyük/izole ajans müşterisi için doğru, ama Commerce Platform vizyonundaki "çok sayıda küçük mağaza" senaryosu için ÖLÇEKLENMEZ:**
- **Maliyet:** Her proje ayrı ücretlendirme birimi — 50-100 mağaza için süper-doğrusal maliyet artışı.
- **Operasyon:** Her migration'ı onlarca projeye tek tek uygulamak (bugün Petra'ya elle uygulanıyor) yüzlerce mağazada sürdürülemez, şema sürüklenmesi (drift) riski büyür.
- **Env-var patlaması:** Her mağaza için 3 yeni env-var (`SUPABASE_URL_<KEY>` deseni) — yüzlerce mağazada Vercel env-var yönetimi başlı başına risk.

**Auth/RBAC iskeleti taşınabilir ama `customer_id` tek başına yetersiz** — commerce'te bir müşterinin birden fazla mağazası, bir mağazada birden fazla rolü (owner/staff/viewer) olabilir; bugünkü `customer_users` şeması (admin→NULL, customer→tek customer_id zorunlu constraint'i) bunu desteklemiyor, `store_id` kavramının eklenmesi gerekiyor.

**CMS deseni (`fetchPublishedList`, status=draft/published, sort_order) kategori/marka/kampanya içeriği için doğrudan yeniden kullanılabilir**, ama ürün/stok için yetersiz — stok eşzamanlılık/race-condition kontrolü ve "asla statik veriye fallback etmeyen" bir commerce data-access katmanı gerektirir.

Detaylı NOW/LATER/FUTURE sınıflandırması için bkz. §20-22.

---

## 14. OWASP Security Findings

| Madde | Bulgu | Risk |
|---|---|---|
| A01 Broken Access Control | M1/M2 (self-contained olmayan yetki kontrolleri) | Medium |
| A01 Broken Access Control | Open redirect (`auth/callback`) | **High** |
| A03 Injection (SQLi) | Bulgu yok — tüm erişim parametrik query builder ile | Low/Yok |
| A03 Injection (SSRF) | Bulgu yok — tek `fetch()` (Resend API), hedef sabit | Low/Yok |
| A03 Injection (XSS) | CMS `title` alanı JSON-LD'ye escape edilmeden gömülüyor (`app/(public)/cozumler/[slug]/page.tsx` → `lib/seo/structured-data.ts`) | **High** |
| A04 Insecure Design | MFA hiç yok | Gap |
| A05 Security Misconfiguration | `tracking_public_settings` SECURITY DEFINER view | Medium |
| A05 Security Misconfiguration | Leaked password protection kapalı | Medium |
| A07 Auth Failures | **Login'de rate limiting yok** | **High** |
| A08 Data Integrity | SVG upload whitelist'te, sanitize yok | Medium |
| A09 Logging Failures | Auth olayları + yetkisiz erişim reddleri loglanmıyor | Medium |
| CSRF | Server Actions'ın origin-check varsayılanına güveniliyor, 2 API route'u da düşük risk | Low |
| Cookie/Session | Kütüphane varsayılanı, override yok | Info (güvenli) |
| Input Validation | 11/12 action zod kullanıyor, login şemasız | Low |

---

## 15. Critical Findings

**Hiçbir "Critical" (bugün, düşük efor + yüksek etkiyle, geri dönüşü olmayan bir felakete yol açacak) seviyesinde bulgu tespit edilmedi.** En yakın adaylar (open redirect, login brute-force, stored XSS) "High" olarak sınıflandırıldı çünkü sömürülmeleri ya belirli bir ön koşula (kullanıcının phishing linkine tıklaması, ya da zaten bir admin hesabının ele geçirilmiş olması) ya da zaman/kaynak yatırımına (brute-force) bağlı — ama commerce'e geçmeden önce MUTLAKA kapatılmalılar, bu yüzden "What Must Be Fixed Before E-Commerce" (§19) listesinin en başında yer alıyorlar.

## 16. High Findings

**H1 — Open Redirect / Userinfo-Host Enjeksiyonu**
`app/auth/callback/route.ts` (satır ~23, ~30) — `next` parametresi doğrulanmadan `${origin}${next}` şeklinde birleştiriliyor. `next=@evil.com` → tarayıcı bunu `evil.com`'a yönlendirir (userinfo/host ayrıştırma hilesi). Bu route Supabase invite/magic-link/recovery e-postalarının hedefi olduğu için saldırgan, meşru görünümlü bir link ile phishing yapabilir.
**Düzeltme:** `next`'i yalnızca `/` ile başlayan, `//`/`@`/`:` içermeyen bir path'e whitelist'leyin.

**H2 — Login'de Rate Limiting Yok**
`app/(auth)/login/actions.ts` — `signInWithPassword` öncesi/sonrası hiçbir deneme sayacı yok. Sınırsız brute-force/credential-stuffing riski.
**Düzeltme:** Mevcut `lib/security/rate-limit.ts` yardımcı fonksiyonunu (zaten iletişim formunda kullanılıyor) burada da IP+email anahtarıyla uygulayın (örn. 5 deneme/15dk). Commerce öncesi kalıcı/dağıtık bir çözüme (Upstash Redis) geçilmesi önerilir.

**H3 — CMS Alanından Kaçırılmamış Stored XSS**
`lib/seo/structured-data.ts` (breadcrumb JSON-LD üreticisi) → `app/(public)/cozumler/[slug]/page.tsx` — Supabase `solutions.title` alanı (admin panelinden düzenlenebilir) hiçbir escape olmadan `dangerouslySetInnerHTML` ile JSON-LD script bloğuna gömülüyor. Admin panelinde bir alan `</script><script>...` içerecek şekilde doldurulursa (kötü niyetli/ele geçirilmiş bir admin hesabı ile), bu TÜM public site ziyaretçilerinde çalışan bir XSS'e dönüşür.
**Düzeltme:** `JSON.stringify(data).replace(/</g, '\\u003c')` deseni (Next.js'in kendi önerdiği standart) tüm JSON-LD üreticilerine uygulanmalı.

**H4 — Customer Silindiğinde Ayrı Customer-DB Temizlenmiyor (Orphan PII)**
Bugün UI'da hard-delete action'ı yok, bu yüzden şu an tetiklenemez — ama bir "mağaza sil" özelliği eklenmeden önce mutlaka çözülmesi gereken bir mimari boşluk (bkz. §7, §19).

## 17. Medium Findings

- **M1** — `loadCustomerConnection`/`resolveConnectionKeyForCustomer` kendi içinde yetki kontrolü yapmıyor, tip sistemi çağıranın önce `requireCustomerAccess()` çağırmasını zorlamıyor. Bugün 30/30 çağrı yeri doğru ama gelecekte yeni bir action bunu atlarsa gerçek cross-tenant IDOR olur.
- **M2** — `inviteUser()` kendi içinde admin kontrolü yapmıyor, aynı desen.
- **M3** — `tracking_public_settings` SECURITY DEFINER view, ileride yanlış değiştirilirse `meta_capi_token` sızabilir.
- **M4** — Supabase Auth "Leaked Password Protection" kapalı.
- **M5** — Login/logout ve yetkisiz erişim reddleri audit_logs'a yazılmıyor.
- **M6** — `image/svg+xml` upload whitelist'te, sanitize edilmiyor.
- **M7** — `websites_customer_id_fkey` CASCADE — gelecekte çoklu-website müşterilerde riskli.
- **M8** — `hero_sections`/`seo_settings` arasında tutarsız ON DELETE semantiği (SET NULL vs CASCADE).

## 18. Low Findings

- `login/actions.ts`'te zod şeması yok.
- `lib/supabase/server.ts` yorumunda var olmayan bir `middleware.ts`'e atıf var (fiilen `lib/supabase/proxy.ts` bu görevi görüyor — sadece yorum güncel değil).
- `app/api/health/supabase/route.ts` kimliksiz erişime açık (gerçek secret sızdırmıyor, ama iyi pratik değil).
- `changeUserRoleAction`'da hedef `customerId`'nin DB'de var olduğu doğrulanmıyor (sadece uuid formatı) — sadece kullanıcı deneyimi sorunu.
- `lib/auth/audit-log.ts` içinde güncel olmayan "hiçbir yerden çağrılmıyor" yorumu.
- `leads`/`tracking_settings` tablolarında anon/authenticated'a geniş tablo-seviyesi GRANT (RLS zaten engelliyor, ama RLS yanlışlıkla kapatılırsa geniş GRANT'ler tehlikeli olur).

---

## 19. What Must Be Fixed Before E-Commerce

Sıralama, gerçek para/ödeme verisi işlenmeye başlamadan önce zorunlu:

1. **H2 — Login rate limiting** (brute-force, en ucuz ve en acil düzeltme).
2. **H1 — Open redirect düzeltmesi** (phishing vektörü, tek satırlık bir whitelist kontrolü).
3. **H3 — JSON-LD XSS escape'i** (tüm yapılandırılmış veri üreticilerine tek bir yardımcı fonksiyon eklenerek).
4. **MFA/2FA** — en azından platform admin hesapları için zorunlu kılınmalı (Supabase Auth'un yerleşik TOTP API'si).
5. **M1/M2'nin tip-seviyesinde zorlanması** — `loadCustomerConnection` ve `inviteUser` imzalarının, çağıranın önce doğrulama yapmış olduğunu kanıtlayan bir parametre/tip almasını zorunlu kılacak şekilde değiştirilmesi.
6. **Customer/store silme akışının tasarlanması** (H4) — commerce'te "mağaza kapat" gerçek bir özellik olacağı için, ayrı customer-DB'nin de temizlendiği/arşivlendiği bir orkestrasyon adımı olmadan bu özellik ASLA UI'a eklenmemeli.
7. **Dağıtık rate limiting** — bugünkü bellek-içi `rate-limit.ts` tek instance için yeterli ama ödeme/checkout gibi kritik endpoint'ler için Upstash Redis (veya benzeri) tabanlı kalıcı bir çözüme geçilmeli.
8. **Webhook güvenliği** (ödeme/kargo sağlayıcıları bağlanmadan önce) — HMAC imza doğrulama + idempotency-key kontrolü, ilk entegrasyon koduyla birlikte NOW olarak tasarlanmalı, sonradan eklenecek bir şey olarak ertelenmemeli.

---

## 20. Recommended Platform Architecture

**Çekirdek karar: "connectionKey" soyutlamasını genelleştirin.** Bugünkü "her müşteri = ayrı Supabase projesi" modelini bozmadan, üstüne bir `stores` tablosu (Platform DB'de) ekleyin: `store_id`, `customer_id`, ve İSTEĞE BAĞLI `supabase_connection_key` (doluysa "ayrı proje" modeli, boşsa "paylaşılan DB + store_id ile RLS" modeli). Böylece:
- Petra gibi büyük/izole müşteriler ayrı projede kalabilir.
- Taktikalp46 gibi ilk commerce müşterisi doğrudan paylaşılan bir "commerce" Supabase projesinde `store_id` sütunuyla başlayabilir — yüzlerce ayrı proje açmaya gerek kalmadan.

Auth/RBAC şemasına `store_id` ekleyin (customer → 1..N store, customer_users satırına opsiyonel store_id — NULL ise "bu müşterinin tüm mağazaları"). `is_customer_member()` deseninin `is_store_member(store_id)` sürümünü aynı SECURITY DEFINER yaklaşımıyla ekleyin.

CMS'in `fetchPublishedList`/status=published deseni kategori/marka/kampanya içeriği için olduğu gibi kullanılabilir; ürün/stok için ayrı, kendi eşzamanlılık kontrolüne sahip bir "commerce data access" katmanı (asla statik veriye fallback etmeyen) inşa edin.

## 21. Recommended Phase 1

**NOW (Faz 1'de yapılması gereken, ertelenemez):**
- §19'daki 8 madde (güvenlik düzeltmeleri).
- `stores` tablosu + `store_id` şema genişlemesi (§20) — commerce kodu yazılmaya başlamadan ÖNCE bu temel atılmalı.
- Payment/Shipping provider arayüz sözleşmelerinin (TypeScript interface + config tabloları) tasarlanması — somut bir sağlayıcı entegre etmeden.
- `logAuditEvent`'in `action` isimlendirme konvansiyonunun commerce fiillerini (`order.status_changed`, `payment.captured` vb.) kapsayacak şekilde şimdiden standartlaştırılması.

**LATER (Taktikalp46 canlıya alınırken):**
- Gerçek ürün/kategori/varyant/stok/sipariş şeması.
- İlk somut ödeme + kargo sağlayıcısı entegrasyonu (NOW'da tasarlanan arayüze göre).
- Rol granülaritesinin genişletilmesi (owner/staff/viewer).

**FUTURE (birden fazla mağaza/gerçek trafik sonrası):**
- Çoklu sağlayıcı failover, öneri motoru ("Mağazanı Geliştir"), AI destekli Store Advisor.
- Audit log'ların immutable/append-only export'u (finansal uyum gerekirse).
- Onlarca mağazaya ulaşıldığında migration otomasyon CLI'ı.

## 22. Future Commerce Architecture

```
Commerce Platform (paylaşılan Supabase projesi, store_id ile RLS izolasyonu)
│
├── stores (Platform DB'deki customers/websites'in devamı)
├── products / categories / brands / variants / stock
├── orders (durum makinesi: yeni→hazırlanıyor→kargoda→teslim→iptal)
├── customers_of_store (mağazanın kendi müşterileri — Platform'daki customer_users'tan FARKLI bir kavram)
├── payment_providers / shipping_providers (adapter config tabloları)
├── campaigns / coupons
├── webhooks_log (idempotency + imza doğrulama kayıtları)
└── audit_logs (store_id eklenmiş, genişletilmiş action sözlüğü)
```

Service-role kullanımı bu modelde kaçınılmaz olarak büyüyecek (ödeme webhook'ları, stok güncellemeleri — kullanıcı oturumu olmayan işlemler). Her yeni service-role çağrı noktası için "girişte store_id doğrulaması zorunlu" kuralı code-review checklist'ine eklenmeli; ileride ortak bir `withServiceRoleGuard(storeId, fn)` sarmalayıcısı bunu yapısal olarak zorunlu kılabilir.

## 23. Open Questions

1. Taktikalp46 için hangi ödeme sağlayıcısı (Ödeal mi başka biri mi) ve hangi kargo sağlayıcısı (Kargonomi/Basit Kargo) öncelikli olacak? Bu, LATER fazındaki ilk somut adapter'ın hangisi olacağını belirler.
2. Petra'nın mevcut ayrı-proje modeli korunacak mı, yoksa o da ileride paylaşılan modele mi taşınacak? (Öneri: Petra'yı olduğu gibi bırakmak, yalnızca yeni mağazaları paylaşılan modelde başlatmak.)
3. `customers_of_store` (mağazanın kendi müşterileri/alıcıları) ile Platform DB'deki `customer_users` (ajansın panel kullanıcıları) arasındaki kavramsal ayrım net mi? İsimlendirme çakışması ileride kafa karıştırabilir.
4. MFA zorunluluğu hangi rol seviyesinde başlayacak (sadece platform admin mi, yoksa mağaza sahipleri de mi)?
5. `leads` tablosunda bulunan test verisinin ("Test Kullanıcı 3", 2026-08-19) temizlenmesi onaylanıyor mu? (Bu audit'in kapsamı dışında bırakıldı, ayrı bir onay gerektirir.)
6. Customer/store "hard delete" özelliği gerçekten UI'a eklenecek mi, yoksa "deactivate" (bugünkü model) her zaman yeterli mi kabul edilecek? Cevap, §19 madde 6'nın aciliyetini belirler.
