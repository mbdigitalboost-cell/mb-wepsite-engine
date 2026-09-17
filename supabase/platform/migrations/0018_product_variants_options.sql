-- =============================================================================
-- PLATFORM MIGRATION 0018
-- option_groups + option_values + product_variants + variant_option_values
-- — P0 e-commerce foundation, group C
--
-- Depends on 0017 (products). Tek migration'da birlikte çünkü hepsi
-- birbirine sıkı bağlı (variant_option_values hem product_variants hem
-- option_values'a FK veriyor) — tek mantıksal birim: "ürünün
-- yapılandırılabilir varyant alt-sistemi". claude/
-- TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md'nin birebir uygulanması.
--
-- OPTION MODEL: ürün-bazlı (her ürün kendi option_group'larını tanımlar),
-- MAĞAZA-GENELİ PAYLAŞIMLI/GLOBAL DEĞİL — bilinçli minimal tasarım,
-- over-engineering'den kaçınmak için (design doc'taki gerekçe: global
-- reusable option group'lar bugün gerçek bir ihtiyaç değil, ileride
-- nullable bir template_group_id EKLENEREK genişletilebilir, bugünkü
-- şema bunu ENGELLEMİYOR).
--
-- option_groups/option_values tablolarında ANON PUBLIC SELECT POLİTİKASI
-- YOK (bu turun açık talimatı) — bunlar sadece admin/configurator UI'ı
-- tarafından kullanılıyor, storefront render'ı product_variants/
-- product_images üzerinden zaten yeterli veriye sahip.
--
-- TENANT GÜVENLİĞİ — composite FK'ler NEDEN GÜVENLİ BURADA (0017'deki
-- category_id/brand_id'nin AKSİNE): buradaki TÜM composite FK'ler ya
-- NOT NULL + ON DELETE CASCADE (option_groups.product_id,
-- option_values.option_group_id, variant_option_values.variant_id) ya da
-- NOT NULL + ON DELETE RESTRICT (variant_option_values.option_value_id)
-- — hiçbiri "on delete set null" DEĞİL, bu yüzden 0017'nin
-- category_id/brand_id'sinde açıklanan "SET NULL + NOT NULL sütun
-- çakışması" riski burada YOK.
--
-- DELETE BEHAVIOR asimetrisi (variant_option_values):
--   - variant_id yönünde CASCADE: bir varyant silinirse, o varyantın
--     option-value bağlantıları da silinir (varyant zaten yok oluyor).
--   - option_value_id yönünde RESTRICT: hâlâ canlı bir varyant tarafından
--     kullanılan bir option-value SİLİNEMEZ — admin önce o varyantı
--     silmeli/güncellemeli. Bilinçli asimetri: bir option_group'un
--     TAMAMINI silmek (zaten cascade) büyük/bilinçli bir eylem; tek bir
--     option_value'yu silmek küçük görünüp yanlışlıkla bir varyantı
--     kimliksiz bırakabilecek bir eylem.
--
-- KABUL EDİLEN, DB SEVİYESİNDE ENFORCE EDİLMEYEN BİR KURAL (bilinçli
-- kabul edilen boşluk, over-engineering'den kaçınmak için): "bir varyant,
-- aynı option_group'tan birden fazla value seçemez" application-level
-- (server action) kontrolüne bırakıldı — DB'de bunu enforce etmek bir
-- trigger gerektirir.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- option_groups
-- -----------------------------------------------------------------------------

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  name text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint option_groups_product_id_name_unique unique (product_id, name),
  constraint option_groups_id_store_id_unique unique (id, store_id),
  constraint option_groups_product_id_store_id_fkey
    foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade
);

comment on table public.option_groups is
  'P0 e-commerce foundation: per-product option groups (e.g. "Renk", "Beden") for the configurator-ready variant model. Product-scoped, not a store-wide reusable dictionary (deliberate minimal design). See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md. No public anon SELECT policy — dashboard/configurator-only.';

create trigger set_option_groups_updated_at
  before update on public.option_groups
  for each row execute function public.set_updated_at();

create index option_groups_store_id_idx on public.option_groups (store_id);
create index option_groups_product_id_idx on public.option_groups (product_id);

alter table public.option_groups enable row level security;

create policy option_groups_select_member_or_admin
  on public.option_groups for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy option_groups_insert_editor_tier
  on public.option_groups for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy option_groups_update_editor_tier
  on public.option_groups for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy option_groups_delete_admin_tier
  on public.option_groups for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));

-- -----------------------------------------------------------------------------
-- option_values
-- -----------------------------------------------------------------------------

create table public.option_values (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  option_group_id uuid not null,
  value text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint option_values_group_id_value_unique unique (option_group_id, value),
  constraint option_values_id_store_id_unique unique (id, store_id),
  constraint option_values_group_id_store_id_fkey
    foreign key (option_group_id, store_id) references public.option_groups (id, store_id) on delete cascade
);

comment on table public.option_values is
  'P0 e-commerce foundation: individual selectable values within an option_group (e.g. "Kırmızı", "L"). No updated_at (rows are effectively immutable identifiers, only sort_order/deletion change). No public anon SELECT policy. See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md.';

create index option_values_store_id_idx on public.option_values (store_id);
create index option_values_option_group_id_idx on public.option_values (option_group_id);

alter table public.option_values enable row level security;

create policy option_values_select_member_or_admin
  on public.option_values for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy option_values_insert_editor_tier
  on public.option_values for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy option_values_update_editor_tier
  on public.option_values for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy option_values_delete_admin_tier
  on public.option_values for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));

-- -----------------------------------------------------------------------------
-- product_variants
-- -----------------------------------------------------------------------------

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  sku text,
  name text not null,
  price numeric(12, 2) check (price is null or price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= price),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_sku_unique unique (store_id, sku),
  constraint product_variants_id_store_id_unique unique (id, store_id),
  constraint product_variants_product_id_store_id_fkey
    foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade
);

comment on table public.product_variants is
  'P0 e-commerce foundation: sellable variants of a product (e.g. size/color combinations). price/compare_at_price NULLABLE = inherit the parent product''s price (resolved at the application layer, e.g. parsed.data.price ?? product.price). No image_url column — variant imagery is managed exclusively via product_images.variant_id (see migration 0019), to avoid two competing sources of truth for a variant''s image. See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md.';

create trigger set_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

create index product_variants_store_id_idx on public.product_variants (store_id);
create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_is_active_idx on public.product_variants (store_id, is_active);

alter table public.product_variants enable row level security;

create policy product_variants_select_member_or_admin
  on public.product_variants for select
  to authenticated
  using ((select public.is_store_member(store_id)));

-- Public visibility requires BOTH this variant's own is_active AND its
-- parent product's is_active — a variant must never leak via anon SELECT
-- just because its own flag is true while the product itself is hidden.
-- This is a deliberate refinement beyond the flat "same 5 policies"
-- template used for categories/brands/products (which have no such
-- parent relationship to check).
create policy product_variants_select_public_active
  on public.product_variants for select
  to anon
  using (
    is_active = true
    and (select public.is_store_publicly_visible(store_id))
    and exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_active = true
    )
  );

create policy product_variants_insert_editor_tier
  on public.product_variants for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy product_variants_update_editor_tier
  on public.product_variants for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy product_variants_delete_admin_tier
  on public.product_variants for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));

-- -----------------------------------------------------------------------------
-- variant_option_values (junction)
-- -----------------------------------------------------------------------------

create table public.variant_option_values (
  variant_id uuid not null,
  option_value_id uuid not null,
  store_id uuid not null references public.stores (id) on delete cascade,
  constraint variant_option_values_pkey primary key (variant_id, option_value_id),
  constraint variant_option_values_variant_id_store_id_fkey
    foreign key (variant_id, store_id) references public.product_variants (id, store_id) on delete cascade,
  constraint variant_option_values_option_value_id_store_id_fkey
    foreign key (option_value_id, store_id) references public.option_values (id, store_id) on delete restrict
);

comment on table public.variant_option_values is
  'P0 e-commerce foundation: junction table linking a product_variant to the option_values that define it. variant_id deletes CASCADE (a deleted variant takes its links with it); option_value_id deletes RESTRICT (an option_value still referenced by a live variant cannot be deleted until that variant is reassigned/removed). NOT DB-enforced: "a variant may not select two values from the same option_group" — left to application-level validation to avoid a trigger for P0. See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md. No public anon SELECT policy.';

create index variant_option_values_option_value_id_idx on public.variant_option_values (option_value_id);

alter table public.variant_option_values enable row level security;

create policy variant_option_values_select_member_or_admin
  on public.variant_option_values for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy variant_option_values_insert_editor_tier
  on public.variant_option_values for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy variant_option_values_update_editor_tier
  on public.variant_option_values for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy variant_option_values_delete_admin_tier
  on public.variant_option_values for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));
