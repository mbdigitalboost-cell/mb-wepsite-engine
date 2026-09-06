-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0009
-- seo_settings.route_key — static-page SEO override (Faz 6F-4A-3)
--
-- Hibrit SEO modelinin ikinci katmanı (Faz 6F-4A-3 mimari kararı):
--   - Site-wide SEO   -> page_id IS NULL, route_key IS NULL (0003'ten beri
--                        değişmeden çalışıyor, bu migration dokunmuyor)
--   - Statik sayfa SEO -> page_id IS NULL, route_key = '<route-segment>'
--                        (ör. 'hakkimizda', 'iletisim') — BU migration'ın
--                        eklediği YENİ katman
--   - Dynamic content SEO (`/cozumler/[slug]` vb.) -> route_key KULLANMAZ,
--                        kendi content satırının (solutions.title/
--                        short_description) alanlarını kullanmaya devam
--                        eder — bu migration'ın kapsamı DIŞINDA
--
-- `pages` tablosu BİLİNÇLİ OLARAK aktifleştirilmiyor (Faz 6F-4A-3 analiz
-- raporu — 0 satır, sıfır SELECT/INSERT/UPDATE tüketicisi, iki FK'si de
-- her yerde hardcoded NULL) — `page_id` kolonuna hiç dokunulmuyor, mevcut
-- FK/davranışı aynen korunuyor.
--
-- TENANT ISOLATION NOTU (Faz 6F-4A-3.1 analiz raporu): bu tabloda
-- customer_id/website_id YOK ve OLMASI da GEREKMİYOR — izolasyon bu
-- customer-template'in HER müşteri için AYRI, fiziksel olarak bağımsız
-- bir Supabase projesine uygulanmasıyla sağlanıyor (bkz.
-- supabase/customer-template/README.md). Bu yüzden aşağıdaki
-- `unique(route_key)` constraint'i, bu proje içinde otomatik olarak
-- "bu tenant'a scoped" anlamına geliyor — ayrı bir tenant kolonu/composite
-- key GEREKMİYOR (iki customer'ın constraint'leri birbirinden habersiz,
-- tamamen ayrı veritabanlarında yaşıyor).
--
-- MIGRATION SAFETY: production'da seo_settings 0 satır (bağımsız
-- doğrulandı) — additive nullable kolon + 0 satırlı tabloya eklenen iki
-- constraint, hiçbir mevcut veriyi/sorguyu/RLS'i etkilemiyor, backfill
-- gerektirmiyor. RLS policy'sine (`seo_settings_public_select ...
-- using (true)`) DOKUNULMUYOR — Postgres RLS satır bazlı çalıştığı için
-- yeni kolon otomatik olarak mevcut policy'nin kapsamına giriyor.
--
-- NULL SEMANTİĞİ (bilerek, kod tarafında bu migration'da DEĞİŞTİRİLMİYOR):
-- Postgres'in standart UNIQUE davranışı NULL değerleri birbirinden farklı
-- sayar — yani birden fazla `route_key IS NULL` satırına (teorik olarak)
-- izin verilir, tıpkı bugün `page_id IS NULL` için de DB seviyeli "en
-- fazla 1 site-wide satır" garantisi olmadığı gibi (mevcut kod bunu
-- sadece uygulama mantığıyla — "önce ara, sonra kaydet" — sağlıyor). Bu
-- migration bu ÖNCEDEN VAR OLAN durumu ne artırıyor ne azaltıyor; admin
-- action/validation/UI tarafındaki değişiklikler ayrı bir fazın (Faz
-- 6F-4A-3.2) kapsamı.
-- =============================================================================

alter table public.seo_settings
  add column route_key text;

alter table public.seo_settings
  add constraint seo_settings_page_route_check
  check (page_id is null or route_key is null);

alter table public.seo_settings
  add constraint seo_settings_route_key_unique
  unique (route_key);

comment on column public.seo_settings.route_key is
  'Statik sayfa SEO override anahtarı (ör. ''hakkimizda'', ''iletisim'') — NULL ise site-wide varsayılan. Dynamic content sayfaları (/cozumler/[slug] vb.) bunu kullanmaz, kendi content satırlarının alanlarını kullanır. page_id ile birlikte dolu OLAMAZ (bkz. seo_settings_page_route_check).';
