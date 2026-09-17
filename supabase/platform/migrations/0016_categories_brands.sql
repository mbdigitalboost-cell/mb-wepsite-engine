-- =============================================================================
-- PLATFORM MIGRATION 0016
-- categories + brands — P0 e-commerce foundation, group A
--
-- claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md'de onaylanan tasarımın
-- birebir uygulanması. Bu migration hiçbir mevcut tabloya/fonksiyona
-- dokunmuyor — sadece 0008'in zaten var olan RBAC fonksiyonlarını
-- (is_store_member/is_store_editor_member/is_store_admin_member/
-- is_store_publicly_visible) yeniden kullanarak 2 yeni tablo ekliyor.
-- Yeni hiçbir helper function icat edilmiyor.
--
-- categories ve brands aynı migration'da, çünkü ikisi de 0017 (products)
-- için nullable FK hedefi ve ondan ÖNCE var olmaları gerekiyor.
--
-- TENANT İZOLASYONU: her iki tabloda da store_id not null, stores(id)'e
-- on delete cascade. unique(id, store_id) her ikisinde de var —
-- ileride bu tablolara bağlanacak çocuk tabloların composite FK
-- kurabilmesi için (0007_stores.sql'in kendi unique(slug) + gelecekteki
-- composite FK ihtiyacı deseniyle aynı mantık, bkz. 0017/0018/0019).
--
-- SLUG: store_id-scoped unique, GLOBAL DEĞİL (design doc kararı).
-- Format kontrolü stores.slug ile AYNI regex (0007_stores.sql,
-- stores_slug_format).
--
-- categories.parent_id -> SET NULL (RESTRICT değil): bir üst kategori
-- silindiğinde alt kategoriler sessizce üst-seviyeye çıkar, veri kaybı
-- olmaz. parent_id'nin AYNI store'a ait olduğu (composite FK ile DB
-- seviyesinde garanti edilmiyor — Postgres'te bir tablonun kendi kendine
-- olan composite self-FK'si pratik değil) application-level (server
-- action) kontrolüne bırakıldı; RLS zaten store_id bazlı okuma/yazmayı
-- kısıtlıyor, bu sadece "yanlış store'un kategorisini parent seçme"
-- senaryosuna karşı ek bir uygulama-katmanı kontrolü gerektirir.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  parent_id uuid references public.categories (id) on delete set null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_unique unique (store_id, slug),
  constraint categories_id_store_id_unique unique (id, store_id),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.categories is
  'P0 e-commerce foundation: store-scoped product categories, self-referencing hierarchy via parent_id. store_editor+ writes, store_admin+ deletes, anon reads only is_active rows of a publicly-visible store. See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md.';

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create index categories_store_id_idx on public.categories (store_id);
create index categories_parent_id_idx on public.categories (store_id, parent_id);
create index categories_is_active_idx on public.categories (store_id, is_active);

alter table public.categories enable row level security;

create policy categories_select_member_or_admin
  on public.categories for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy categories_select_public_active
  on public.categories for select
  to anon
  using (is_active = true and (select public.is_store_publicly_visible(store_id)));

create policy categories_insert_editor_tier
  on public.categories for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy categories_update_editor_tier
  on public.categories for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy categories_delete_admin_tier
  on public.categories for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));

-- -----------------------------------------------------------------------------
-- brands
-- -----------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  logo_url text,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_slug_unique unique (store_id, slug),
  constraint brands_id_store_id_unique unique (id, store_id),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.brands is
  'P0 e-commerce foundation: store-scoped product brands, no hierarchy. Same RBAC/RLS pattern as categories. See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md. NOTE: unrelated to supabase/customer-template/migrations/0011_brands.sql — that file targets a different, never-applied, per-customer-database architecture (see that file''s own header); this table lives in the Central Platform project only, no naming collision in any real database.';

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create index brands_store_id_idx on public.brands (store_id);
create index brands_is_active_idx on public.brands (store_id, is_active);

alter table public.brands enable row level security;

create policy brands_select_member_or_admin
  on public.brands for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy brands_select_public_active
  on public.brands for select
  to anon
  using (is_active = true and (select public.is_store_publicly_visible(store_id)));

create policy brands_insert_editor_tier
  on public.brands for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy brands_update_editor_tier
  on public.brands for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy brands_delete_admin_tier
  on public.brands for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));
