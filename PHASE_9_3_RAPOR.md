# PHASE 9.3 RAPORU — SEO + Tracking CMS Entegrasyonu

Bu fazda `seo_settings` public site metadata sistemine, `tracking_settings` (yalnızca güvenli `tracking_public_settings` view'ı üzerinden) GTM/GA4/Meta Pixel script'lerine bağlandı. Hiçbir migration çalıştırılmadı — mevcut şema (Faz 5) her iki hedef için de yeterliydi. Mevcut Platform/Petra Supabase mimarisi, RLS politikaları ve çalışan public site tasarımı bozulmadı. Git commit/push yapılmadı.

## 0) Önce yapılan inceleme

- `supabase/customer-template/migrations/0001_site_settings_pages.sql`, `0003_seo_tracking_media_nav.sql`, `0005_customer_rls.sql` yeniden okundu.
- `lib/cms/customer-types.ts`, `lib/cms/adapters/seo.ts`, `lib/cms/adapters/shared.ts` yeniden okundu.
- Dashboard SEO/Tracking ekranları (`app/dashboard/customers/[customerId]/{seo,tracking}/*`) tamamen okundu — ikisi de zaten doğru yazılmıştı (bkz. §5 "Dashboard tarafı — değişmedi").
- Gerçek Petra DB'de `pages`, `seo_settings`, `tracking_settings` tablolarının bugünkü durumu salt-okunur sorgularla kontrol edildi: **üçü de 0 satır**. Yani bugüne kadar dashboard'dan hiç SEO veya tracking verisi girilmemiş.
- `app/layout.tsx` (kök, motor-nötr), `app/(public)/layout.tsx` (Petra'ya özel), `app/(public)/page.tsx`, `lib/tracking/tracking-scripts.tsx`, `lib/seo/structured-data.ts`, `app/robots.ts`, `app/sitemap.ts` okundu.

## 1) SEO — Şema Yeterlilik Analizi

`seo_settings` (migration 0003): `page_id, title, description, canonical, og_image, robots_index, robots_follow`. **Şema, bu fazın hedefleri için tam yeterli — hiçbir migration gerekmedi.**

`site_settings` ile `seo_settings` arasındaki mevcut sorumluluk ayrımı korundu: `site_settings` işletme/marka verisi (telefon, adres, logo, renkler...), `seo_settings` yalnızca meta etiketleri. Hiçbiri diğerinin alanına taşmadı.

### Sayfa bazlı SEO — bilinçli kapsam sınırı

`seo_settings.page_id`, `pages` tablosuna referans veriyor (sayfa bazlı SEO şema seviyesinde zaten destekleniyor). Ancak:
- `pages` tablosu bugün **0 satır** — hiçbir route için `pages` kaydı yok.
- Dashboard'da yalnızca site geneli (`page_id IS NULL`) SEO ekranı var; `pages` yönetimi için (oluşturma/düzenleme) hiçbir dashboard ekranı yok.

Bu durumda her public route'u (`/hizmetler`, `/projeler` vb.) ayrı ayrı `pages`+`seo_settings` satırına bağlamak, düzenlenemeyen/yönetilemeyen bir bağlantı kurmak anlamına gelirdi — şema hazır ama editör arayüzü yok. Bu yüzden bu fazda **yalnızca site geneli SEO'yu bağladım** (bkz. §3) ve sayfa bazlı SEO'yu, gerekli dashboard "sayfa yönetimi" ekranı inşa edildiğinde devreye alınabilecek şekilde net bir karar noktası olarak bıraktım — **hiçbir yeni migration gerekmez**, sadece: (a) dashboard'a `pages` CRUD + sayfa-bazlı SEO formu eklemek, (b) her route'un `generateMetadata`'sında slug→`pages.id` çözümlemesiyle `getSeo(key, fallback, pageId)` çağırmak (adapter zaten bunu destekliyor, `lib/cms/adapters/seo.ts`'deki `pageId` parametresi Faz 5'ten beri hazır).

## 2) Tracking — Şema İncelemesi

`tracking_settings`: `ga4_id, gtm_id, meta_pixel_id, meta_capi_enabled, meta_capi_token`. RLS: anon/authenticated için **hiçbir SELECT politikası yok** (tam deny). `tracking_public_settings` VIEW: yalnızca `ga4_id, gtm_id, meta_pixel_id` — `meta_capi_token` yapısal olarak bu view'da hiç yok, `grant select ... to anon, authenticated` sadece bu view'a verilmiş (0005). **Şema tam yeterli, migration gerekmedi.**

## 3) Yapılan Değişiklikler

| Dosya | Değişiklik |
|---|---|
| `lib/seo/build-metadata.ts` (yeni) | `resolveSiteWideSeo()` (CMS'ten site geneli `seo_settings` satırını okur, page_id IS NULL), `applyLayoutSeoOverrides()` (root `(public)` layout için: `robots` + OG görseli + `title.default`), `applyHomeSeoOverrides()` (homepage için: `title`, `description`, `canonical`, OG title/description/image) |
| `lib/cms/adapters/tracking.ts` (yeni) | `getTrackingPublicSettings()` — yalnızca `tracking_public_settings` VIEW'ını okur (anon client, RLS'e tabi), asla `tracking_settings` tablosuna veya service-role client'a dokunmaz |
| `lib/cms/adapters/index.ts` | `getTrackingPublicSettings` export edildi |
| `lib/cms/petra/resolve-solutions.ts` (yeni) | Faz 9.2'de `cozumler/[slug]/page.tsx` içine yazılmış olan `resolvePetraSolutions()` yardımcı fonksiyonu paylaşılan bir dosyaya taşındı — artık `app/sitemap.ts` da aynı fonksiyonu kullanıyor |
| `lib/tracking/tracking-scripts.tsx` | Opsiyonel `gtmId`/`ga4Id`/`metaPixelId` prop'ları eklendi (varsayılan: statik env var'lar — Hero/Solutions'taki mevcut "opsiyonel CMS override" deseniyle birebir aynı) |
| `app/layout.tsx` | `<TrackingScripts />` KALDIRILDI — gerekçe aşağıda (§4) |
| `app/(public)/layout.tsx` | `generateMetadata()` eklendi (CMS site geneli SEO + statik fallback); `<TrackingScripts gtmId=... ga4Id=... metaPixelId=... />` eklendi (CMS `tracking_public_settings` + statik env fallback) |
| `app/(public)/page.tsx` | `generateMetadata()` eklendi (CMS site geneli SEO + statik fallback); `title.absolute` düzeltmesi (bkz. §6) |
| `app/(public)/cozumler/[slug]/page.tsx` | `resolvePetraSolutions()` artık paylaşılan dosyadan import ediliyor, davranış değişmedi |
| `app/sitemap.ts` | CMS-öncelikli hale getirildi (`resolvePetraSolutions()`), statik `petraSolutions` fallback olarak korundu |
| `app/robots.ts` | **DEĞİŞTİRİLMEDİ** — zaten domain/CMS'ten bağımsız, `NEXT_PUBLIC_SITE_URL` üzerinden çalışıyor; CMS/domain yapısıyla uyumsuzluk yok, değiştirmeye gerek görülmedi |

## 4) TrackingScripts'in kök layout'tan taşınması — neden

Faz 9.3 öncesinde `<TrackingScripts />` motor-nötr **kök** `app/layout.tsx`'te monte ediliyordu — bu, `/dashboard` ve `/login` dahil HER route'u sarıyordu, yani GTM/GA4/Meta Pixel script'leri (ID'ler doluysa) iç yönetim paneli trafiğinde de tetiklenecekti. Bu muhtemelen hiç kasıtlı değildi. Ayrıca CMS-farkında hale getirmek için bir `connectionKey` ("PETRA") gerekiyor — bu, motor-nötr kök layout'un bilmesi gereken bir şey değil, müşteriye özel `(public)/layout.tsx`'in işi.

Bu yüzden `TrackingScripts`'i kökten kaldırıp yalnızca `(public)/layout.tsx`'e taşıdım. Sonuç: (a) tracking script'leri artık yalnızca gerçek public Petra sayfalarında çalışıyor, dashboard'da çalışmıyor (test edildi, bkz. §8); (b) CMS bağlantısı doğal olarak mümkün hale geldi. Bu, talep edilen kapsamın doğal bir sonucu olarak yapıldı, ayrı bir "bonus" değişiklik değil — CMS-farkında tracking'in doğru çalışması için gerekliydi.

## 5) Dashboard tarafı — değişmedi

`app/dashboard/customers/[customerId]/seo/*` ve `.../tracking/*` zaten Faz 6'da doğru yazılmıştı, bu fazda hiç dokunulmadı:
- SEO formu: `page_id IS NULL` satırını okuyup yazıyor, service-role client, `requireCustomerAccess` arkasında.
- Tracking formu: `meta_capi_token` **asla** Client Component'e prop olarak geçmiyor — yalnızca `hasToken: boolean` geçiyor (input her zaman boş `password` alanı, boş gönderim = "değiştirme"). Audit log'a token değeri değil, yalnızca `tokenChanged: boolean` yazılıyor.

## 6) Bulunan ve Düzeltilen Sorun: Homepage `<title>` çift sarmalanması

Bu fazda test sırasında homepage'in `<title>`'ının beklenmedik şekilde hem `(public)` layout'un hem KÖK layout'un template'iyle sarmalandığını gördüm: `"Petra Mühendislik — ... | MB Digital Boost"` (olması gereken: sadece `"Petra Mühendislik — ..."`, hiç ek yok).

**Metodolojik not (şeffaflık için):** İlk testlerimde bunu yanlışlıkla "eski arka plan sürecinin çıktısı" sandım, çünkü `pkill -f "next start"` komutum gerçek `next-server` çocuk sürecini eşleştirmiyordu ve arka planda eski build'i servis eden süreçler kalıyordu — bu da testlerimi bir süre yanıltıcı/tutarsız sonuçlar üretir hale getirdi. Sorunu kesin olarak çözmek için tüm süreçleri `next-server` adına göre öldürüp, `.next` klasörünü tamamen silip sıfırdan `npm run build` yaptım ve **hiçbir sunucu süreci çalıştırmadan**, doğrudan inşa edilen statik HTML dosyasını (`.next/server/app/index.html`) inceledim. Bu, sorunun gerçek ve tekrarlanabilir olduğunu kesin olarak doğruladı — süreç kirliliğinden bağımsız.

**Kök neden:** Next.js 16'nın metadata çözümleme algoritması, bir sayfa `title` alanını hiç belirtmediğinde (bu projede homepage'in yaptığı gibi, `(public)` layout'un `default`'unu miras almak için), o `default` değerinin YALNIZCA en yakın atanın template'iyle değil, zincirdeki DAHA ÜST bir atanın (kök layout) da stashlanmış template'iyle sarmalanabildiğini gördüm (`node_modules/next/dist/lib/metadata/resolve-metadata.js`'deki `titleTemplates` biriktirme mantığı, "leaf layout + leaf page" son iki segment için `titleTemplates`'i güncellemiyor — bu da homepage'e ulaşan stashlanmış template'in hâlâ kök layout'unkinden kalma olmasına yol açıyor).

**Düzeltme:** Next'in bunun için resmi olarak dokümante ettiği `title.absolute` alanını kullandım — bu, tüm ata template'lerini (hem `(public)` layout'unkini hem kök layout'unkini) koşulsuz yok sayar. Hem `app/(public)/page.tsx`'in statik `staticMetadata`'sına hem `lib/seo/build-metadata.ts`'deki `applyHomeSeoOverrides()`'ın CMS-override yoluna uygulandı (böylece dashboard'dan girilecek gerçek bir homepage başlığı da aynı şekilde eksiksiz, eksiz görünür). Diğer tüm public sayfalar (`/hizmetler`, `/cozumler` vb.) kendi `title` alanlarını açıkça belirttiği için bu sorunu hiç yaşamıyordu (test edildi, doğru: `"Hizmetler | Petra Mühendislik"`, çift sarmalanma yok) — düzeltme yalnızca homepage'e özeldi.

Doğrulama (sıfırdan build, sunucu süreci olmadan, doğrudan `.next/server/app/*.html` dosyalarından):

| Sayfa | `<title>` |
|---|---|
| `/` | `Petra Mühendislik — İklimlendirmede Mühendislik ve Güven` ✅ (önceden: `... | MB Digital Boost` ❌) |
| `/hizmetler` | `Hizmetler | Petra Mühendislik` ✅ (değişmedi) |
| `/iletisim` | `İletişim | Petra Mühendislik` ✅ (değişmedi) |

## 7) Gerçek Petra DB'de RLS/görünürlük testi (test verisi eklendi, sonra tamamen silindi)

`seo_settings` ve `tracking_settings` tablolarının `status` (draft/published) kolonu yok — bunlar "config", editöryal içerik değil (migration 0003'ün yorumu). Bu yüzden talimat #7'deki "publish edersen sonunda draft'a getir" kuralının bu iki tablo için tam karşılığı yok; bunun yerine **geçici test satırı ekleyip işim bitince tamamen sildim**, DB'yi başlangıçtaki boş (0 satır) durumuna getirdim.

Adımlar (gerçek Petra DB, `wahbjfhvizalenyxjywb`):
1. `seo_settings`'e 1 geçici site-geneli satır eklendi (`title="PHASE 9.3 TEST TITLE"` vb.).
2. `tracking_settings`'e 1 geçici satır eklendi (`meta_capi_token="TEST_SECRET_TOKEN_DO_NOT_USE"` — gerçek bir secret değil, sadece testin amacı).
3. `set local role anon;` ile üç sorgu çalıştırıldı:

| Sorgu (anon rolüyle) | Sonuç |
|---|---|
| `select * from seo_settings` | Test satırı **görünür** (title/description/canonical) — beklenen, RLS `using (true)` |
| `select * from tracking_settings` | **Boş sonuç** — beklenen, RLS'de anon için hiç SELECT politikası yok |
| `select * from tracking_public_settings` | Yalnızca `ga4_id, gtm_id, meta_pixel_id` görünür, **`meta_capi_token` sütunu yapısal olarak hiç yok** — beklenen |

4. İki test satırı da `delete` ile silindi, doğrulama sorgusu her iki tabloda da `count=0` döndü — DB test öncesi haline döndü.

Bu, raporun en kritik güvenlik iddiasını (CAPI token'ın hiçbir şekilde public'e sızmadığı) gerçek veritabanına karşı, gerçek RLS motoruyla, canlı olarak doğruladı.

## 8) Testler

### Lint / TypeScript / Build

Hepsi **PASS**: `npm run lint` (0 hata), `npx tsc --noEmit` (0 hata), `npm run build` (21/21 route, sıfırdan `.next` silinip yeniden derlendi).

### HTTP Testleri (`next start`, gerçek süreç PID'i takip edilerek, sıfırdan build üzerinden)

| Route | Sonuç |
|---|---|
| `/`, `/cozumler`, `/cozumler/split-klimalar`, `/hizmetler`, `/projeler`, `/kampanyalar`, `/hakkimizda`, `/iletisim`, `/login`, `/robots.txt`, `/sitemap.xml` | 200 |
| `/cozumler/nonexistent` | 404 |
| `/dashboard`, `/dashboard/customers/x/seo`, `/dashboard/customers/x/tracking` | 307 → `/login` (oturumsuz erişim engellendi — `requireCustomerAccess`/`requireSession` zinciri bozulmadı) |

İçerik doğrulaması: homepage `<title>` düzeltildi (§6), `<meta name="description">` ve `<meta property="og:title">` doğru render ediliyor, sitemap 6 çözüm URL'sini içeriyor, homepage HTML'inde `gtm.js`/`fbevents.js`/`gtag/js` script referansı YOK (tüm tracking ID'leri bu sandbox'ta boş — beklenen, script'ler doğru şekilde yüklenmiyor).

### Dashboard SEO/Tracking auth testleri

Oturum olmadan `/dashboard/customers/x/seo` ve `/dashboard/customers/x/tracking` → 307 → `/login`. `requireCustomerAccess` zinciri bu fazda hiç değiştirilmedi, regresyon yok.

### Client bundle secret leak taraması (`.next/static`, sıfırdan build sonrası)

| Kontrol | Sonuç |
|---|---|
| Gerçek Platform `SUPABASE_SERVICE_ROLE_KEY` değeri | **YOK** |
| Gerçek Petra `SUPABASE_SERVICE_ROLE_KEY_PETRA` değeri | **YOK** |
| `sb_secret_` deseni (herhangi bir service-role key formatı) | **YOK** |
| `meta_capi_token` / `META_CAPI_ACCESS_TOKEN` / `metaConversionsApiToken` tanımlayıcıları | **YOK** |
| `metaCapiToken` (dashboard form alanı adı, `tracking-form.tsx`) | Var — ama bu sadece bir HTML form `id`/`name` string'i, secret DEĞER değil, beklenen ve zararsız |

Not: Non-`NEXT_PUBLIC_*` server-only değişkenler (`SUPABASE_SERVICE_ROLE_KEY` vb.) Next.js tarafından build-time'da hiçbir yere literal olarak gömülmüyor — `.next/server` sunucu kodunda bile yalnızca `process.env.X` referansı olarak kalıyor, gerçek değer yalnızca çalışma zamanında process ortamından okunuyor. Bu, mimarinin doğru kurulduğunu ayrıca teyit ediyor.

## 9) Kapsam Dışı / Yapılmayanlar (talimat gereği)

- Hiçbir migration çalıştırılmadı (şema zaten yeterliydi, bkz. §1-2).
- Sayfa bazlı (`pages`+`seo_settings.page_id`) SEO editörü İNŞA EDİLMEDİ — şema hazır, dashboard UI'ı yok, bkz. §1.
- `robots.ts` değiştirilmedi — zaten CMS/domain'den bağımsız çalışıyor, uyumsuzluk yok.
- Projects/Campaigns şema geliştirmesine (Faz 9.2'de planlanan `category`/`cta_*` migration'ı) bu fazda dokunulmadı — ayrı faz (9.6) için bırakıldı.
- Media/Storage'a dokunulmadı (Faz 9.4 kapsamı).
- Git commit/push yapılmadı.

## 10) Sıradaki Karar Noktaları

1. Sayfa bazlı SEO editörü (§1) istenirse: küçük bir dashboard eklentisi (`pages` CRUD + route bazlı `seo_settings`) yeterli, migration gerekmiyor.
2. Şu an tracking ID'leri girmek için tek yol dashboard → Tracking ekranı; gerçek ID'ler geldiğinde oradan girilebilir, kod tarafı hazır.
3. PHASE 9.4 (Media/Storage) için hazırız.

Sonucu bekliyorum.
