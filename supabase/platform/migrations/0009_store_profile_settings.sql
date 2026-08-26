-- =============================================================================
-- PLATFORM MIGRATION 0009
-- store_profiles, store_settings (+ store_public_settings view)
--
-- PHASE 2, İLK içerik tabloları. 0008'in yeni yardımcı fonksiyonlarına
-- bağımlı. `stores` (0007) tablosuna hiç DOKUNULMUYOR, hiçbir sütun
-- eklenmiyor — kullanıcının "stores tablosunu gereksiz şekilde büyütme"
-- talimatı gereği, tamamen ayrı, 1:1 modüler tablolar.
--
-- İKİLİ RBAC AYRIMI (kullanıcının 2026-08-25 kararı, madde 2):
--   store_profiles / store_settings -> SADECE store_admin+ yazabilir
--   (is_store_admin_member). store_editor bu iki tabloya YAZAMAZ, sadece
--   okuyabilir — "Store Profile / Store Settings / kritik mağaza
--   ayarları" açıkça store_admin'in kapsamında, store_editor'ün
--   listesinde YOK.
--
-- PUBLIC (anon) YÜZEY: store_profiles doğrudan anon-okunabilir (mağaza
-- AKTİF olduğu sürece) — logo/iletişim/sosyal medya bilgisi zaten
-- vitrinde herkese açık olacak veri. store_settings'İN KENDİSİ ASLA
-- anon'a açılmıyor (customer_settings/order_settings gibi private
-- alanlar barındırıyor) — bunun yerine SADECE aşağıdaki
-- store_public_settings VIEW'ı anon-okunabilir (customer-template
-- 0003_seo_tracking_media_nav.sql'deki tracking_settings/
-- tracking_public_settings deseninin Platform DB eşdeğeri, kanıtlanmış
-- bir desen tekrar kullanılıyor).
--
-- "MAĞAZANI GELİŞTİR" (readiness/completion) UYUMLULUĞU — kullanıcının
-- 2026-08-25 kararı madde 10: bu migration hiçbir "eksiklik skoru"
-- sistemi KURMUYOR (talimat gereği), ama gelecekteki bir readiness
-- kontrolünün ihtiyaç duyacağı tüm alanlar ŞİMDİDEN nullable/kontrol
-- edilebilir: store_profiles.logo_url/favicon_url/phone/email/address
-- IS NULL, social_links = '{}' kontrolü ile "eksik" tespit edilebilir.
-- SEO/GA4/Meta Pixel alanları bu migration'ın kapsamında DEĞİL (henüz
-- talep edilmedi) — ileride ayrı bir store_seo_settings/
-- store_tracking_settings çifti (customer-template'teki seo_settings/
-- tracking_settings ayrımının Platform DB eşdeğeri) eklenecek, o zaman da
-- aynı readiness sorgusu genişletilecek.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- store_profiles — 1:1, mağazanın kimlik/iletişim bilgisi.
-- -----------------------------------------------------------------------------

create table public.store_profiles (
  store_id uuid primary key references public.stores (id) on delete cascade,
  display_name text,
  description text,
  logo_url text,
  favicon_url text,
  phone text,
  email text,
  address text,
  -- Sabit sütunlar yerine jsonb: sosyal platform listesi zamanla değişir
  -- (Instagram/Facebook/WhatsApp/TikTok/...), şema her yeni platformda
  -- migration gerektirmesin diye. Şekli app katmanında (Zod) doğrulanır.
  social_links jsonb not null default '{}'::jsonb,
  -- Ticari unvan/vergi no gibi görüntüleme amaçlı, serbest iş bilgisi.
  business_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_profiles is
  'Phase 2: 1:1 store kimlik/iletişim profili. SADECE store_admin+ yazabilir (is_store_admin_member) — store_editor okuyabilir ama yazamaz. Mağaza aktifse anon tarafından da okunabilir (gelecekteki storefront için).';

create trigger set_store_profiles_updated_at
  before update on public.store_profiles
  for each row execute function public.set_updated_at();

alter table public.store_profiles enable row level security;

create policy store_profiles_select_member_or_admin
  on public.store_profiles for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy store_profiles_select_public_active_store
  on public.store_profiles for select
  to anon
  using ((select public.is_store_publicly_visible(store_id)));

create policy store_profiles_insert_admin_tier
  on public.store_profiles for insert
  to authenticated
  with check ((select public.is_store_admin_member(store_id)));

create policy store_profiles_update_admin_tier
  on public.store_profiles for update
  to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

create policy store_profiles_delete_platform_admin_only
  on public.store_profiles for delete
  to authenticated
  using ((select public.is_platform_admin()));

-- -----------------------------------------------------------------------------
-- store_settings — 1:1, mağazanın operasyonel davranışı. `customer_settings`/
-- `order_settings`/`general_preferences` BİLİNÇLİ OLARAK jsonb: bugün
-- şeması yok (henüz ürün/sipariş modülü kurulmadı), gelecekteki commerce
-- fazlarının bu kovaları dolduracağı bir genişleme alanı.
--
-- `tax_mode` için Postgres ENUM DEĞİL, text+check constraint kullanıldı —
-- 0005/0006'da yaşanan "enum'a yeni değer eklemek ayrı transaction
-- gerektirir" acısını tekrarlamamak için BİLİNÇLİ bir tasarım kararı.
-- -----------------------------------------------------------------------------

create table public.store_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  currency text not null default 'TRY',
  locale text not null default 'tr-TR',
  tax_mode text not null default 'excluded' check (tax_mode in ('included', 'excluded', 'disabled')),
  maintenance_mode boolean not null default false,
  maintenance_message text,
  customer_settings jsonb not null default '{}'::jsonb,
  order_settings jsonb not null default '{}'::jsonb,
  general_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_settings is
  'Phase 2: 1:1 mağaza operasyonel ayarları. SADECE store_admin+ yazabilir. Tablonun KENDİSİ ASLA anon''a açılmaz — sadece store_public_settings view''ı (currency/locale/maintenance_mode/message) anon-okunabilir. maintenance_mode''u true yapmak KRİTİK işlem sayılır (bkz. lib/auth/require-store-access.ts + reauthenticate.ts kullanımı).';

create trigger set_store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

create policy store_settings_select_member_or_admin
  on public.store_settings for select
  to authenticated
  using ((select public.is_store_member(store_id)));

-- KASITLI OLARAK anon SELECT politikası YOK — bu tablo asla doğrudan
-- anon'a açılmıyor, bkz. dosya başındaki yorum ve store_public_settings view'ı.

create policy store_settings_insert_admin_tier
  on public.store_settings for insert
  to authenticated
  with check ((select public.is_store_admin_member(store_id)));

create policy store_settings_update_admin_tier
  on public.store_settings for update
  to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

create policy store_settings_delete_platform_admin_only
  on public.store_settings for delete
  to authenticated
  using ((select public.is_platform_admin()));

-- -----------------------------------------------------------------------------
-- store_public_settings — customer-template'teki tracking_public_settings
-- deseninin (0003_seo_tracking_media_nav.sql) Platform DB eşdeğeri: sadece
-- public-safe 4 kolon, hiçbir private/config alanı YOK. O desenden FARKI:
-- bu DB tek bir müşteriye değil, ÇOK sayıda mağazaya hizmet ediyor, bu
-- yüzden view'ın kendisi de `stores.status = 'active'` filtresini
-- İÇERİYOR — pasif/silinmiş bir mağazanın ayarları hiçbir zaman bu view
-- üzerinden de sızmaz.
-- -----------------------------------------------------------------------------

create view public.store_public_settings
  with (security_invoker = false)
  as
  select
    ss.store_id,
    ss.currency,
    ss.locale,
    ss.maintenance_mode,
    ss.maintenance_message
  from public.store_settings ss
  join public.stores s on s.id = ss.store_id
  where s.status = 'active';

comment on view public.store_public_settings is
  'Public-safe projeksiyon of store_settings — SADECE currency/locale/maintenance_mode/message, ASLA customer_settings/order_settings/general_preferences. security_invoker=false ile store_settings''in RLS''ini bypass eder (view sahibi olarak çalışır) ama SADECE status=''active'' mağazaları döndürür — bu satır filtresi view tanımının kendisinde, RLS''e değil.';
