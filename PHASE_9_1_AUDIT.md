# PHASE 9.1 — Production Integration Audit

Bu doküman salt inceleme (read-only) niteliğindedir. Bu audit sırasında hiçbir kod dosyası değiştirilmedi, hiçbir migration çalıştırılmadı, hiçbir Supabase verisi değiştirilmedi, hiçbir git commit/push yapılmadı. Mevcut mimari, Supabase veritabanları ve çalışan Petra public sitesi olduğu gibi bırakıldı.

Sınıflandırma anahtarı:
- **PASS** — kod altyapısı doğru VE gerçek production bağlantısı bu oturumda (veya Faz 7/8'de) fiilen doğrulandı.
- **WARNING** — kod altyapısı hazır/doğru ama gerçek production bağlantısı/uçtan uca akış henüz doğrulanmadı, ya da bilinçli olarak eksik bırakılmış bir parça var (kapsam dışı, dokümante edilmiş).
- **BLOCKER** — üretime çıkmadan önce mutlaka çözülmesi/karar verilmesi gereken, çalışmayan veya eksik bir bağlantı noktası.

---

## 1) Genel Mimari — Bağlantı Zinciri

`app/(public)/page.tsx` → `lib/cms/adapters/*` → `lib/cms/connection.ts` (`getCustomerPublicSupabaseClient`) → `resolveActiveConnectionKey()` (Platform DB `websites.supabase_connection_key` sorgusu, `lib/supabase/admin.ts` üzerinden) → başarılıysa `SUPABASE_URL_PETRA` / `SUPABASE_ANON_KEY_PETRA` env var'larıyla Petra Customer DB'ye anon client.

Dashboard tarafı: `requireCustomerAccess`/`requireAdmin` (`lib/auth/*`) → `lib/cms/dashboard/require-customer-connection.ts` (`loadCustomerConnection`) → `resolveConnectionKeyForCustomer()` → `getCustomerSupabaseClient()` (service-role client).

Bu iki zincir de kodda **PASS** — mimari doğru, katmanlar arası sorumluluk ayrımı net, hiçbir yerde `if (customer === "petra")` gibi hardcode yok. Faz 5-7'den beri değişmedi.

**Sonuç: PASS** (mimari doğru ve tutarlı).

## 2) Platform Supabase Bağlantısı

`lib/supabase/admin.ts` → `createSupabaseAdminClient()`, `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Platform) kullanıyor. `.env.local`'de bu değerler gerçek Platform projesine (`wnedgbbyqpvylfiwkwen`) ait ve Faz 7'de dolduruldu.

Bu oturumda `npm run build` ile yeniden tetiklendi: build sırasında konsola şu satırlar düştü —
```
[cms/connection] Platform lookup failed for connectionKey: PETRA Host not in allowlist: wnedgbbyqpvylfiwkwen.supabase.co. Add this host to your network egress settings to allow access.
```
Bu, gerçek bir kod hatası DEĞİL — bu sandbox'ın ağ erişimi hâlâ `*.supabase.co`'ya kapalı (Faz 7/8'de tespit edilen, değişmeyen bilinen kısıt). Önemli olan: bu hata build'i düşürmedi, site statik fallback'e düştü, build başarıyla tamamlandı (21/21 route üretildi).

**Sonuç: PASS (kod + fail-soft davranış bu sandbox'ta yeniden doğrulandı) / gerçek canlı bağlantı yalnızca Vercel ortamında (sandbox dışı) doğrulanabilir — bu ayrı bir madde olarak §9'da işaretlendi.**

## 3) Petra Customer Supabase Bağlantısı

`SUPABASE_URL_PETRA` / `SUPABASE_ANON_KEY_PETRA` / `SUPABASE_SERVICE_ROLE_KEY_PETRA` `.env.local`'de gerçek Petra projesine (`wahbjfhvizalenyxjywb`) ait, Faz 7'de dolduruldu, bu audit'te değiştirilmedi.

`resolveActiveConnectionKey("PETRA")` fonksiyonu Platform DB'de `supabase_connection_key='PETRA'` + `status='active'` satırını arıyor — bu satır Faz 7'de oluşturulmuştu, bu oturumda tekrar değiştirilmedi/silinmedi.

**Sonuç: PASS (kod altyapısı) / WARNING (bu spesifik oturumda DB'ye karşı yeniden execute_sql ile tekrar sorgulanmadı — Faz 7-8'de doğrulanmıştı, veri durumunun değişmediği varsayılıyor, talimat gereği bu audit'te Supabase verisine dokunulmadı).**

## 4) CMS Adapter → Public Route Kapsamı (önemli bulgu)

Kod detaylı incelendi — hangi public route'un gerçekten CMS'e bağlı, hangisinin hâlâ statik olduğu net ayrıldı:

| Route/Bölüm | CMS'e bağlı mı? | Not |
|---|---|---|
| `/` — Hero | **Evet** | `getHero()`, CMS satırı varsa kullanılıyor, yoksa `petraHero` fallback |
| `/` — Solutions (özet) | **Evet** | `getSolutions()` |
| `/` — Testimonials | **Evet** | `getTestimonials()` |
| `/` — FAQ | **Evet** | `getFaqs()` |
| `/` — WhatsApp numarası | **Evet** | `getSiteSettings()` → `mapSiteSettingsWhatsapp` |
| `/` — Projects, Campaigns (bölümler) | **Hayır** | Bilinçli olarak bağlanmamış — component'lerin ihtiyaç duyduğu alanlar (`category`, CTA alanları) CMS tablo şemasında yok; Faz 6 raporunda gerekçelendirilmiş |
| `/cozumler` (liste) | **Hayır** | `lib/data/petra/solutions.ts` statik veri |
| `/cozumler/[slug]` (detay) | **Hayır** | Aynı statik veri kaynağı |
| `/hizmetler` | **Hayır** | `lib/data/petra/services.ts` statik veri |
| `/projeler` | **Hayır** | `Projects` component'i, statik veri |
| `/kampanyalar` | **Hayır** | `lib/data/petra/campaigns.ts` statik veri |
| `/hakkimizda`, `/iletisim` | **Hayır** | Statik sayfalar, CMS adapter'ı hiç çağırmıyor |

`getServices`, `getProjects`, `getCampaigns` adapter'ları kodda mevcut ve doğru yazılmış ama **hiçbir route tarafından import edilmiyor** — yalnızca `lib/cms/adapters/index.ts` barrel'inde export ediliyor, ölü kod (dead code) durumunda.

**Sonuç: WARNING.** Bu bir hata değil, Faz 6'da bilinçli/dokümante edilmiş bir kapsam kararı — ama "Petra sitesi CMS'e bağlı" derken bunun yalnızca ana sayfanın 5 bölümü için geçerli olduğu, alt sayfaların (`cozumler`, `hizmetler`, `projeler`, `kampanyalar`) hâlâ tamamen statik/koddan geldiği açıkça belirtilmeli. Dashboard'dan bu sayfalardaki içerikleri değiştirmek şu an public sitede HİÇBİR ETKİ yaratmaz.

## 5) SEO Adapter

`lib/cms/adapters/seo.ts` (`getSeo()`) doğru yazılmış (Faz 5 kurallarına uygun, sahte SEO verisi üretmiyor) ama **hiçbir route'ta çağrılmıyor** — `generateMetadata` fonksiyonları her yerde (`app/(public)/page.tsx`, `cozumler/[slug]/page.tsx` vb.) hâlâ elle yazılmış statik `title`/`description` kullanıyor, `seo_settings` tablosundan hiçbir şey okunmuyor.

**Sonuç: WARNING.** Dashboard'daki `/dashboard/customers/[customerId]/seo` ekranından girilen veriler şu an public sitenin `<title>`/`<meta description>`'ına hiç yansımıyor — altyapı (tablo + adapter + dashboard formu) hazır, son bağlantı (route → adapter çağrısı) eksik.

## 6) Tracking

- `app/layout.tsx` içindeki `TrackingScripts` (GTM/GA4/Meta Pixel) yalnızca statik `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_META_PIXEL_ID` env var'larını okuyor — bunlar `.env.local`'de şu an boş.
- Petra Customer DB'de `tracking_settings` tablosu ve public-safe `tracking_public_settings` view'ı (Faz 5'te tasarlanmış, `META_CAPI_TOKEN` hariç tutuyor) migration'larda mevcut, dashboard'da `/dashboard/customers/[customerId]/tracking` ekranı bu tabloyu okuyup yazabiliyor.
- Ancak kodda **hiçbir yerde** `tracking_public_settings` view'ından public tarafta veri çeken bir adapter/çağrı yok — `TrackingScripts` component'i bu view'dan tamamen habersiz.

**Sonuç: WARNING.** Dashboard'dan bir müşterinin GTM/GA4/Pixel ID'sini girmek, şu anki kodda public sitede hiçbir şeyi tetiklemeyecek — bunun için ya `TrackingScripts`'in CMS'ten okuyacak şekilde güncellenmesi ya da bilinçli olarak "tracking ID'leri şimdilik yalnızca ortam değişkeni (Vercel env var) üzerinden ayarlanıyor" kararının netleştirilmesi gerekiyor. Bu, gelecekteki bir faz için net bir karar noktası.

## 7) Leads (Keşif Talebi Formu)

`lib/leads/submit-discovery-request.ts` → `getCustomerSupabaseClient("PETRA")` (service-role, RLS bypass) → `leads` tablosuna insert. Hata durumunda veya bağlantı yoksa sessizce `console.error`'a düşüyor, kullanıcıya her zaman başarı (`{ok: true}`) dönüyor — Faz 6'da bilinçli tasarlanmış davranış, değişmedi.

**Sonuç: PASS (kod) / WARNING (gerçek bir form gönderiminin, gerçek Petra `leads` tablosuna ulaştığı bu spesifik oturumda uçtan uca — gerçek HTTP submit ile — tekrar doğrulanmadı; sandbox network kısıtı nedeniyle zaten doğrulanamaz, Vercel ortamında test edilmeli).**

## 8) Storage / Medya

`app/dashboard/customers/[customerId]/media/media-form.tsx` içindeki not açıkça şunu söylüyor: *"Gerçek dosya yükleme bu fazın kapsamında değil — burada mevcut/erişilebilir bir URL kaydedilir."* Migration dosyalarında herhangi bir Supabase Storage bucket tanımı (`storage.buckets` insert/policy) yok.

**Sonuç: BLOCKER (gerçek görsel/medya yönetimi için) — ama bilinçli, dokümante edilmiş bir eksik, "hata" değil.** Petra için gerçek görseller/logo geldiğinde: (a) ya bir Supabase Storage bucket + upload akışı kurulmalı, (b) ya da görseller `public/images/petra/*` altına statik dosya olarak eklenmeli (mevcut klasör yapısı zaten bunun için hazır — `public/images/petra/{hero,solutions,services,projects,campaigns,brand}`). Bu bir sonraki fazda netleştirilmesi gereken bir mimari karar.

## 9) Dashboard Authentication / Authorization Zinciri

`lib/auth/require-customer-access.ts`, `lib/auth/require-admin.ts`, `lib/auth/require-role.ts`, `lib/cms/dashboard/require-customer-connection.ts` tek tek okundu. Zincir Faz 1/4'ten beri değişmemiş:
- `requireCustomerAccess` gerçek session + membership kontrolü yapıyor, yanlış customerId için `notFound()` (404) dönüyor — bilgi sızıntısını önlemek için bilinçli tasarım.
- Gerçek güvenlik sınırı RLS (`is_customer_member()`/`is_platform_admin()`, Platform migration 0004) — bu fonksiyon sadece hızlı/temiz UX katmanı, "gerçek" sınır değil (kod içi yorum bunu açıkça belirtiyor).
- `loadCustomerConnection` her adımda `null` dönebiliyor, hiçbir yerde throw yok — sayfa çökmeden "CMS bağlantısı bekleniyor" durumuna düşecek şekilde tasarlanmış.

Bu audit'te herhangi bir kırılma/regresyon bulunmadı; dosyalar Faz 4/6'daki haliyle aynı.

**Sonuç: PASS (kod seviyesinde) / WARNING (gerçek bir customer kullanıcısıyla — admin olmayan bir hesapla — canlı Vercel ortamında uçtan uca giriş + yetkilendirme testi bu audit kapsamında yapılmadı; Faz 4/6'da yerel ortamda test edilmişti).**

## 10) Build / Lint / TypeScript Baseline (bu oturumda yeniden çalıştırıldı)

| Kontrol | Sonuç |
|---|---|
| `npm run lint` | **PASS** — 0 hata |
| `npx tsc --noEmit` | **PASS** — 0 hata |
| `npm run build` | **PASS** — 21/21 route başarıyla üretildi, tek uyarı seti yukarıdaki (§2) beklenen ağ-kısıtı log satırlarıydı, build'i düşürmedi |

## 11) Vercel Durumu (bu audit'te salt-okunur kontrol edildi)

`mcp__Vercel__get_project` ile `petra-muhendislik` (`prj_fr6R2ymc6gor8QjljRl67GlF76N9`) projesi tekrar sorgulandı:
- Proje hâlâ mevcut, son deployment `READY` durumda (Faz 8'deki placeholder deploy).
- Domains: `petra-muhendislik.vercel.app`, `petra-muhendislik-mbdigitalboost.vercel.app`.
- **Hiçbir Git repository bağlantısı yok** — proje bir GitHub/GitLab reposuna bağlı değil, hâlâ yalnızca doğrudan dosya-tree deploy'la oluşturulmuş placeholder içeriyor.
- Bu MCP araç setinde environment variable listeleme/okuma aracı yok — env var'ların Vercel panelinde gerçekten girilip girilmediği bu oturumdan doğrulanamıyor (ne isim ne değer görülebiliyor). **Bu durum siz VS Code/Vercel panelinden onaylamadan BLOCKER olarak kalır.**

**Sonuç: WARNING → henüz BLOCKER'a dönüşebilir.** Gerçek kod deploy edilmeden ve env var'lar girilmeden production canlı akış doğrulanamaz.

## 12) Vercel İçin Gerekli Environment Variable'lar (yalnızca isimler — değer yok)

| Değişken | Kaynak proje | Zorunlu mu |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Platform (`mb-digital-platform`) | Evet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Platform | Evet |
| `SUPABASE_SERVICE_ROLE_KEY` | Platform | Evet (server-only) |
| `SUPABASE_URL_PETRA` | Petra Customer (`petra mühendislik`) | Evet |
| `SUPABASE_ANON_KEY_PETRA` | Petra Customer | Evet |
| `SUPABASE_SERVICE_ROLE_KEY_PETRA` | Petra Customer | Evet (server-only) |
| `NEXT_PUBLIC_SITE_URL` | — | Gerçek domain belirlenince |
| `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | — | Opsiyonel, gerçek ID geldiğinde (bkz. §6 — şu an public sitede CMS'ten değil yalnızca bu env var'lardan okunuyor) |
| `META_CAPI_ACCESS_TOKEN` | — | Opsiyonel, server-only |

Hiçbir gerçek değer bu raporda yazılmadı.

## 13) Kapsam Dışı — Bu Audit'te Yapılmayanlar (talimat gereği)

Kod değiştirilmedi, migration çalıştırılmadı, Supabase verisi (Platform veya Petra) değiştirilmedi, git commit/push yapılmadı, Vercel proje ayarları değiştirilmedi. Sadece `npm run lint` / `npx tsc --noEmit` / `npm run build` (yerel, salt-okunur doğrulama amaçlı) ve `mcp__Vercel__get_project` (salt-okunur) çalıştırıldı.

---

## Özet — PASS / WARNING / BLOCKER Sayımı

| Alan | Durum |
|---|---|
| CMS adapter → connection factory → Platform resolver → Petra DB zinciri (mimari) | PASS |
| Platform Supabase bağlantısı (kod + fail-soft) | PASS |
| Petra Customer Supabase bağlantısı (kod) | PASS |
| Petra Customer Supabase (bu oturumda DB'ye karşı yeniden doğrulama) | WARNING |
| Ana sayfa CMS entegrasyonu (Hero/Solutions/Testimonials/FAQ/WhatsApp) | PASS |
| Alt sayfalar (`cozumler`, `hizmetler`, `projeler`, `kampanyalar`) — CMS'e bağlı değil | WARNING |
| SEO adapter — route'lara bağlı değil | WARNING |
| Tracking — CMS tracking_settings'e bağlı değil, yalnızca statik env var | WARNING |
| Leads formu (kod) | PASS |
| Leads formu (canlı ortamda uçtan uca doğrulama) | WARNING |
| Medya/Storage — gerçek dosya yükleme yok | BLOCKER (bilinçli, dokümante) |
| Dashboard auth/RLS zinciri (kod, regresyon yok) | PASS |
| Dashboard auth (canlı ortamda uçtan uca doğrulama) | WARNING |
| Lint / TypeScript / Build | PASS |
| Vercel proje — placeholder, git'e bağlı değil, env var durumu doğrulanamıyor | WARNING → BLOCKER'a dönüşebilir |

**Genel değerlendirme:** Mimari ve kod tarafında hiçbir regresyon veya kırık bağlantı bulunmadı — Faz 1-8'de kurulan altyapı sağlam. Asıl eksikler iki kategoride toplanıyor: (1) bilinçli olarak henüz bağlanmamış CMS parçaları (alt sayfalar, SEO, tracking — kod hazır ama son tel çekilmemiş), (2) gerçek production ortamı (Vercel env var + gerçek kod deploy'u) henüz tamamlanmadı, bu da "kod çalışıyor" ile "canlıda çalıştığı doğrulandı" arasındaki farkın kapatılmasını bekliyor.

Sonucu bekliyorum — PHASE 9.2 için hangi noktalara öncelik vermemi istediğinizi belirtin.
