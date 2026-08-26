-- =============================================================================
-- PLATFORM MIGRATION 0011
-- homepage_section_types (referans), store_homepage_sections
--
-- 0008'e bağımlı. `stores`/store_profiles/store_settings/store_branding/
-- store_navigation_*'a dokunmuyor.
--
-- BÖLÜM TİPİ LİSTESİ: kullanıcının 2026-08-25 kararı madde 7'deki örnek
-- listeden (Hero, Featured Categories, Featured Products, Campaign
-- Banner, Trust/Benefits, Brands, Testimonials, Custom Content, CTA,
-- Footer) birebir alındı — uydurma bir liste değil.
--
-- ENUM DEĞİL, REFERANS TABLO + text FK: `section_type_key` bir Postgres
-- enum OLARAK DEĞİL, `homepage_section_types` referans tablosuna FK
-- olarak modellendi — 0005/0006'daki enum-genişletme acısını tekrar
-- yaşamamak için BİLİNÇLİ tasarım kararı (bu proje için artık standart
-- bir desen). Yeni bir bölüm tipi eklemek gelecekte bir migration DEĞİL,
-- platform-admin'in bu tabloya bir satır eklemesi olacak (render eden
-- frontend component'i ayrıca yazılmalı — bu migration'ın kapsamı değil).
--
-- ARBITRARY HTML/JS ÇALIŞTIRMA YOK (madde 7): `title`/`description` düz
-- metin sütunları, `config` jsonb sadece bölüm-özel yapılandırılmış veri
-- (ör. hero'nun ikincil CTA'sı) — hiçbiri ham HTML/JS/script olarak
-- saklanmaz veya `dangerouslySetInnerHTML` benzeri bir yolla render
-- edilmez (app katmanının sorumluluğu, bkz. lib/validation/homepage-section.ts).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- homepage_section_types — platform-admin yönetimli referans/lookup.
-- Dashboard-only (anon'a hiç açılmıyor — storefront render'ı zaten
-- store_homepage_sections.section_type_key'i biliyor, bu tabloyu ayrıca
-- sorgulamasına gerek yok; sadece "+ Bölüm Ekle" picker'ı kullanır).
-- -----------------------------------------------------------------------------

create table public.homepage_section_types (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  label text not null,
  description text,
  default_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.homepage_section_types is
  'Phase 2: platform-admin yönetimli referans tablo — Homepage Builder''ın "+ Bölüm Ekle" picker''ının sunduğu bölüm tipleri. Yeni bir tip eklemek migration değil, bu tabloya (platform-admin tarafından) bir INSERT''tür; render eden frontend component''i ayrıca yazılmalı. Dashboard-only, anon''a açılmıyor.';

create trigger set_homepage_section_types_updated_at
  before update on public.homepage_section_types
  for each row execute function public.set_updated_at();

alter table public.homepage_section_types enable row level security;

create policy homepage_section_types_select_authenticated
  on public.homepage_section_types for select
  to authenticated
  using (true);

create policy homepage_section_types_write_platform_admin_only
  on public.homepage_section_types for insert
  to authenticated
  with check ((select public.is_platform_admin()));

create policy homepage_section_types_update_platform_admin_only
  on public.homepage_section_types for update
  to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy homepage_section_types_delete_platform_admin_only
  on public.homepage_section_types for delete
  to authenticated
  using ((select public.is_platform_admin()));

insert into public.homepage_section_types (key, label, description) values
  ('hero', 'Hero', 'Ana sayfa üst banner — başlık, açıklama, görsel, CTA.'),
  ('featured_categories', 'Öne Çıkan Kategoriler', 'Seçili kategorilerin vitrin gridi.'),
  ('featured_products', 'Öne Çıkan Ürünler', 'Seçili/otomatik ürünlerin vitrini.'),
  ('campaign_banner', 'Kampanya Banner', 'Tek bir kampanya/promosyon banner''ı.'),
  ('trust_benefits', 'Güven / Avantajlar', 'İkonlu güven unsurları veya avantaj listesi.'),
  ('brands', 'Markalar', 'Marka/logo şeridi.'),
  ('testimonials', 'Referanslar', 'Müşteri yorumları/referansları.'),
  ('custom_content', 'Özel İçerik', 'Serbest başlık/açıklama/görsel bloğu (HTML/JS içermez).'),
  ('cta', 'Çağrı (CTA)', 'Tek bir eylem çağrısı bloğu.'),
  ('footer', 'Footer', 'Ana sayfaya özel footer bölümü (site geneli footer''dan ayrı).');

-- -----------------------------------------------------------------------------
-- store_homepage_sections — bir mağazanın ana sayfasındaki bölüm
-- ÖRNEKLERİ (instance), sıralı.
--
-- Ortak alanlar (title/description/image_url/link_url) GERÇEK sütun —
-- kullanıcının madde 7'deki "başlık, açıklama, görsel, link" listesi
-- birebir. `config` jsonb SADECE bölüm-tipine özel EKSTRA veri için (ör.
-- featured_products'ın hangi ürünleri göstereceği, ileride ürün modülü
-- kurulunca).
-- -----------------------------------------------------------------------------

create table public.store_homepage_sections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  section_type_key text not null references public.homepage_section_types (key),
  internal_label text,
  title text,
  description text,
  image_url text,
  link_url text,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_homepage_sections is
  'Phase 2: bir mağazanın ana sayfasındaki bölüm örnekleri, sıralı. store_editor+ oluşturabilir/güncelleyebilir/PASİFLEŞTİREBİLİR; KALICI SİLME store_admin+''e ayrılmış (store_navigation_items ile birebir aynı gerekçe). sort_order client''tan gelen ham değer olarak GÜVENİLMEZ, server transaction''ı kendi yeniden hesaplar. title/description düz metin — asla ham HTML/JS olarak render edilmez.';

create trigger set_store_homepage_sections_updated_at
  before update on public.store_homepage_sections
  for each row execute function public.set_updated_at();

create index store_homepage_sections_store_id_idx on public.store_homepage_sections (store_id);
create index store_homepage_sections_sort_order_idx on public.store_homepage_sections (sort_order);
create index store_homepage_sections_section_type_key_idx on public.store_homepage_sections (section_type_key);

alter table public.store_homepage_sections enable row level security;

create policy store_homepage_sections_select_member_or_admin
  on public.store_homepage_sections for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy store_homepage_sections_select_public_active
  on public.store_homepage_sections for select
  to anon
  using (is_active = true and (select public.is_store_publicly_visible(store_id)));

create policy store_homepage_sections_insert_editor_tier
  on public.store_homepage_sections for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy store_homepage_sections_update_editor_tier
  on public.store_homepage_sections for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy store_homepage_sections_delete_admin_tier
  on public.store_homepage_sections for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));
