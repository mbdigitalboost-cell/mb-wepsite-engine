-- =============================================================================
-- PLATFORM MIGRATION 0019
-- product_images — P0 e-commerce foundation, group D
--
-- Depends on 0017 (products) and 0018 (product_variants) — variant_id is
-- nullable but its FK target must already exist. claude/
-- TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md'nin birebir uygulanması.
--
-- storage_path (image_url DEĞİL): Supabase Storage bucket path saklanır,
-- public URL okuma anında türetilir — customer-template/migrations/
-- 0006_media_storage_bucket.sql'de zaten kurulmuş "RLS-gated storage
-- bucket" deseniyle tutarlı. NOT: bu migration bir storage bucket
-- OLUŞTURMUYOR — bir "product-images" bucket'ının (kendi RLS policy'siyle)
-- önceden veya ayrı bir adımda kurulması gerekecek; bu, bu migration
-- setinin kapsamı dışında bırakıldı (talimat: sadece tabloları oluştur).
--
-- variant_id: HARDENING FIX (P0 MIGRATION SECURITY REVIEW'ın Design
-- Deviation A bulgusu) — composite FK (variant_id, store_id) ->
-- product_variants(id, store_id), PostgreSQL 15+'ın "ON DELETE SET NULL
-- (column_list)" syntax'ı ile (`on delete set null (variant_id)`) — 0017
-- category_id/brand_id ile BİREBİR AYNI düzeltme, aynı gerekçe: store_id
-- ASLA null'a çekilmiyor, sadece variant_id. İzole scratch PostgreSQL
-- 16'da ampirik olarak doğrulandı: bir variant silindiğinde SADECE
-- variant_id null oldu, store_id değişmedi; cross-tenant bir variant_id
-- ataması (Store A image + Store B variant) composite FK tarafından
-- REDDEDİLDİ.
--
-- is_primary: partial unique index ile "üründe en fazla 1 birincil
-- görsel" DB seviyesinde enforce ediliyor, application-level kontrole
-- güvenilmiyor.
--
-- Anon public SELECT: product_images'ın kendi is_active/is_published
-- alanı yok — görünürlüğü PARENT ÜRÜNÜN is_active durumuna bağlı (aynı
-- 0018'deki product_variants_select_public_active refinement'ı, aynı
-- gerekçeyle: bir gizli/pasif ürünün görselleri anon'a asla sızmamalı).
-- =============================================================================

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_product_id_store_id_fkey
    foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade,
  constraint product_images_variant_id_store_id_fkey
    foreign key (variant_id, store_id) references public.product_variants (id, store_id)
    on delete set null (variant_id)
);

comment on table public.product_images is
  'P0 e-commerce foundation: one or more images per product, optionally scoped to a specific variant (variant_id nullable — a null value means "general product image"). variant_id deleting SET NULL: removing a variant reverts its photos to plain product-level images rather than destroying them. See claude/TAKTIKALP46_P0_ECOMMERCE_SCHEMA_DESIGN.md.';

create index product_images_store_id_idx on public.product_images (store_id);
create index product_images_product_id_idx on public.product_images (product_id);
create index product_images_variant_id_idx on public.product_images (variant_id);

-- At most one primary image per product (partial unique index — a real
-- DB-level guarantee, not left to application-level convention).
create unique index product_images_primary_per_product_idx
  on public.product_images (product_id)
  where is_primary;

alter table public.product_images enable row level security;

create policy product_images_select_member_or_admin
  on public.product_images for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy product_images_select_public_active
  on public.product_images for select
  to anon
  using (
    (select public.is_store_publicly_visible(store_id))
    and exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_active = true
    )
  );

create policy product_images_insert_editor_tier
  on public.product_images for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy product_images_update_editor_tier
  on public.product_images for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy product_images_delete_admin_tier
  on public.product_images for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));
