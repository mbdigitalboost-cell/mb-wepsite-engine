-- =============================================================================
-- PLATFORM MIGRATION 0017
-- products — P0 e-commerce foundation, group B
--
-- Depends on 0016 (categories, brands) for nullable category_id/brand_id
-- FK targets. claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md'nin
-- birebir uygulanması.
--
-- BİLİNÇLİ OLARAK EKLENMEYEN alanlar (design doc kararı, bu migration
-- turunun kendi talimatıyla da teyit edildi):
--   - currency: store_settings.currency zaten var (migration 0009);
--     ürün başına ayrı para birimi bugün gerçek bir ihtiyaç değil.
--   - is_published: store_homepage_sections/store_navigation_items ile
--     aynı tek-bayrak deseni — is_active hem admin togglesı hem anon
--     RLS kapısı.
--
-- price/compare_at_price: numeric(12,2) — asla float/double (parasal
-- yuvarlama hatasından kaçınmak için). stock: integer, bigint değil
-- (tek SKU'nun stok adedi gerçekçi olarak 2^31'e asla yaklaşmaz).
--
-- category_id/brand_id: HARDENING FIX (P0 MIGRATION SECURITY REVIEW'ın
-- Design Deviation A bulgusu) — composite FK (category_id, store_id) ->
-- categories(id, store_id) / (brand_id, store_id) -> brands(id, store_id),
-- PostgreSQL 15+'ın "ON DELETE SET NULL (column_list)" syntax'ı ile.
-- ÖNCEKİ TASARIM (tek-sütunlu FK) bir composite FK + düz "on delete set
-- null"ın store_id'yi de null'a çekeceği varsayımına dayanıyordu — bu
-- YANLIŞTI: PG15+ SET NULL için hangi sütun(lar)ın null'a çekileceğini
-- açıkça belirtme imkanı sunuyor (`on delete set null (category_id)`),
-- bu yüzden store_id ASLA dokunulmuyor, NOT NULL ihlali riski yok. Bu,
-- izole bir scratch PostgreSQL 16 üzerinde ampirik olarak doğrulandı
-- (bkz. P0 MIGRATION HARDENING FIX raporu): parent silindiğinde SADECE
-- category_id/brand_id null oldu, store_id değişmedi; cross-tenant bir
-- category_id/brand_id ataması (Store A product + Store B category/
-- brand) composite FK tarafından REDDEDİLDİ. Central Platform'un canlı
-- Postgres sürümü (17.6) bu syntax'ı tam olarak destekliyor.
-- =============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid,
  brand_id uuid,
  name text not null,
  slug text not null,
  sku text,
  short_description text,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= price),
  stock integer not null default 0 check (stock >= 0),
  track_inventory boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_unique unique (store_id, slug),
  constraint products_sku_unique unique (store_id, sku),
  constraint products_id_store_id_unique unique (id, store_id),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_category_id_store_id_fkey
    foreign key (category_id, store_id) references public.categories (id, store_id)
    on delete set null (category_id),
  constraint products_brand_id_store_id_fkey
    foreign key (brand_id, store_id) references public.brands (id, store_id)
    on delete set null (brand_id)
);

comment on table public.products is
  'P0 e-commerce foundation: store-scoped product catalog entries. unique(id, store_id) exists specifically so 0018/0019''s child tables (product_variants, product_images, option_groups) can declare a composite FK (product_id, store_id) references products(id, store_id) — a DB-level guarantee, on top of RLS, that a child row can never point at a product belonging to a different store. See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md.';

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index products_store_id_idx on public.products (store_id);
create index products_category_id_idx on public.products (store_id, category_id);
create index products_brand_id_idx on public.products (store_id, brand_id);
create index products_is_active_idx on public.products (store_id, is_active);

alter table public.products enable row level security;

create policy products_select_member_or_admin
  on public.products for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy products_select_public_active
  on public.products for select
  to anon
  using (is_active = true and (select public.is_store_publicly_visible(store_id)));

create policy products_insert_editor_tier
  on public.products for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy products_update_editor_tier
  on public.products for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy products_delete_admin_tier
  on public.products for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));
