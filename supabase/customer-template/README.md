# Customer Template — Supabase Migrations

Bu klasördeki SQL dosyaları, **her müşteri için ayrı ayrı kurulacak** bir
Supabase projesinin şablonudur. Platform Supabase projesinden (bkz.
`supabase/platform/`) tamamen farklı bir amacı var:

- **Platform Supabase** (tek, merkezi proje): kim giriş yapabilir, hangi
  müşteriler/websiteler var, kim hangi müşteriyi görebilir. `profiles`,
  `customers`, `websites`, `customer_users`, `audit_logs`.
- **Customer Template** (bu klasör): **yalnızca bir** müşterinin gerçek
  web sitesi içeriği (hero metni, hizmetler, projeler, SEO, tracking,
  medya, leads). Her müşteri kendi ayrı Supabase projesine sahip olacak
  ve bu migration'lar oraya uygulanacak.

## Şu an durumu

Bu migration'lar **henüz hiçbir gerçek Supabase projesine uygulanmadı**.
Yalnızca dosya olarak hazırlandı ve yerel/test Postgres üzerinde
fonksiyonel olarak doğrulandı (bkz. Phase 5 raporu). Petra için henüz
ayrı bir Supabase projesi açılmadı — Petra sitesi hâlâ tamamen
`lib/data/petra/*.ts` statik verisiyle çalışıyor.

## Bir müşteri için nasıl kurulur (gelecekte)

1. O müşteri için yeni, ayrı bir Supabase projesi oluştur.
2. `0001` → `0005` sırasıyla migration'ları o projeye uygula.
3. Vercel'de o müşterinin websitesi için üç ortam değişkenini tanımla:
   - `SUPABASE_URL_<CONNECTION_KEY>`
   - `SUPABASE_ANON_KEY_<CONNECTION_KEY>`
   - `SUPABASE_SERVICE_ROLE_KEY_<CONNECTION_KEY>`
   (örn. Petra için `SUPABASE_URL_PETRA`, `<CONNECTION_KEY>` Platform
   DB'deki `websites.supabase_connection_key` ile birebir aynı olmalı.)
4. Platform DB'de o website'in `supabase_connection_key` alanını aynı
   değere ayarla (bkz. `/dashboard/customers/[id]/websites` — Phase 4).
5. `lib/cms/connection.ts`, bu iki adımı (Platform DB kaydı + env
   değişkenleri) doğrulayıp gerçek client'ı döner — ikisinden biri
   eksikse `null` döner, hata fırlatmaz.

## Şema özeti

- `site_settings` — genel site ayarları (şirket adı, iletişim, marka
  renkleri). Generic — hiçbir müşteriye özel değer migration içine
  yazılmadı.
- `pages` — sayfa kayıtları; `hero_sections`/`seo_settings` sayfa bazlı
  içerik için buna referans verebilir (nullable).
- `hero_sections`, `services`, `solutions`, `projects`, `campaigns`,
  `testimonials`, `faqs`, `navigation_items` — editöryal içerik, hepsi
  `status`: `draft | published | archived`.
- `seo_settings`, `media_assets` — status yok (editöryal değil,
  yapılandırma/varlık verisi), public'e açık.
- `tracking_settings` — `meta_capi_token` içerir, **hiçbir zaman**
  anon/authenticated tarafından okunamaz. Public tracking ID'leri
  (`ga4_id`, `gtm_id`, `meta_pixel_id`) yalnızca `tracking_public_settings`
  view'ı üzerinden, token olmadan sunulur.
- `leads` — bu fazda yalnızca tablo; mevcut discovery-request akışı henüz
  buna yazmıyor.

## RLS modeli (özet)

| Rol | İçerik tabloları | seo/media | tracking_settings | tracking_public_settings | leads |
|---|---|---|---|---|---|
| anon | yalnızca `published` SELECT | SELECT | **DENY** | SELECT | **DENY** |
| authenticated | yalnızca `published` SELECT | SELECT | **DENY** | SELECT | **DENY** |
| service_role | tam erişim | tam erişim | tam erişim | tam erişim | tam erişim |

Hiçbir tabloda anon/authenticated için INSERT/UPDATE/DELETE politikası
yok — RLS açıkken politika yoksa varsayılan davranış zaten reddir. Her
yazma işlemi yalnızca service-role client ile, güvenilir sunucu
kodundan yapılır (bkz. `lib/cms/connection.ts`).

Bu model, Phase 5'te gerçek bir test Postgres üzerinde şu senaryolarla
doğrulandı: published/draft/archived SELECT farkı, anon/authenticated
INSERT reddi, service_role tam erişim, `meta_capi_token`'ın
`tracking_public_settings` view'ında hiç görünmemesi ve alttaki tablodan
okunamaması.
