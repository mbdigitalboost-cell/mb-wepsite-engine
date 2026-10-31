-- =============================================================================
-- PLATFORM MIGRATION 0038
-- brand_models — merkezi marka/model kataloğu (Site Tasarımı v3 + Silahını
-- Seç Sistemi devir metni, Kısım C).
--
-- KÖK NEDEN: model yönetimi şu ana kadar tamamen dağınıktı — her üründe
-- serbest metin (products.models, text[], migration 0034) + geçmiş
-- ürünlerden türetilen bir öneri listesi (lib/commerce/product-models-by-
-- brand.ts'in getStoreModelsByBrand'ı, lib/commerce/public/brands.ts'in
-- getPublicBrandModels'ı) — sabit/merkezi bir katalog YOKTU, bu yüzden
-- "Silahını Seç" akışındaki model listesi de aynı dağınık veriden geliyordu
-- (yazım hatasına/tutarsızlığa açık).
--
-- TASARIM — brands tablosunun (migration 0016) BİREBİR AYNI RLS/RBAC
-- deseni: option_groups/option_values (migration 0018) ile AYNI "çocuk
-- tablo, kendi store_id kolonu + composite FK" şekli — bu repo'nun her
-- çocuk tablosunda tekrarlanan desen, burada da aynen izlendi, yeni bir
-- desen İCAT EDİLMEDİ.
--
-- products.models (text[]) KOLONUNUN KENDİSİ DEĞİŞMİYOR — ürünler hâlâ
-- model ADI dizisi olarak saklıyor (geriye dönük uyumluluk, mevcut
-- ürünlerin verisi bozulmasın). brand_models sadece bir marka için
-- "bilinen/önerilen model adları" kataloğu; ürün formu artık buradan
-- öneri/seçim sunuyor (app katmanı, bu migration'ın kapsamı dışı).
--
-- CASE-INSENSITIVE BENZERSİZLİK — devir metninin kendi talimatı, Faz 8'in
-- marka/kategori eşleştirme fix'iyle TUTARLI: aynı markada "TP9" ile "tp9"
-- aynı model sayılır. Postgres'te ifade (lower(name)) bazlı bir UNIQUE
-- CONSTRAINT yazılamaz (sadece düz kolonlar) — bu yüzden düz `unique()`
-- yerine bir UNIQUE INDEX kullanıldı (option_values_group_id_value_unique
-- gibi düz constraint'lerin AKSİNE, burada ifade gerektiği için index
-- gerekti).
--
-- SEED — geçmiş veri KAYBOLMASIN: migration sonunda, şu anda var olan
-- HER ürünün `models` dizisindeki benzersiz değerler kendi markasının
-- brand_models'ine BİR KEZLİK INSERT edilir (bugün sadece CANİK'in 2
-- ürünü için gerçek veri var, ama bu SQL Taktikalp46'ya özel değil — her
-- store/brand için aynı mantık otomatik çalışır).
-- =============================================================================

create table public.brand_models (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  brand_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint brand_models_id_store_id_unique unique (id, store_id),
  constraint brand_models_brand_id_store_id_fkey
    foreign key (brand_id, store_id) references public.brands (id, store_id) on delete cascade
);

comment on table public.brand_models is
  'Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C — merkezi, markaya bağlı model kataloğu (ör. CANİK -> TP9/TP9SF/TP9DA). products.models (text[], migration 0034) hâlâ bir ürünün GERÇEK model atamasını tutuyor — bu tablo onun yerine geçmiyor, admin ürün formuna/storefront "Silahını Seç" akışına tutarlı bir öneri/seçim listesi sağlıyor. No updated_at — option_values (migration 0018) ile aynı gerekçe: satırlar etkin olarak sabit kimlikler, sadece sort_order/silme değişir.';

create unique index brand_models_brand_id_name_unique_idx on public.brand_models (brand_id, lower(name));
create index brand_models_store_id_idx on public.brand_models (store_id);
create index brand_models_brand_id_idx on public.brand_models (store_id, brand_id);

alter table public.brand_models enable row level security;

create policy brand_models_select_member_or_admin
  on public.brand_models for select
  to authenticated
  using ((select public.is_store_member(store_id)));

-- Kendi is_active kolonu yok (bir modelin "pasif" olması gibi bir durum
-- yok, sadece var/yok) — public görünürlük SADECE üst markanın is_active'ine
-- ve mağazanın genel görünürlüğüne bağlı, product_variants_select_public_active
-- (migration 0018) ile AYNI "üst satırın is_active'ini EXISTS ile kontrol et"
-- deseni.
create policy brand_models_select_public
  on public.brand_models for select
  to anon
  using (
    (select public.is_store_publicly_visible(store_id))
    and exists (
      select 1 from public.brands b
      where b.id = brand_models.brand_id and b.is_active = true
    )
  );

create policy brand_models_insert_editor_tier
  on public.brand_models for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy brand_models_update_editor_tier
  on public.brand_models for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy brand_models_delete_admin_tier
  on public.brand_models for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));

-- -----------------------------------------------------------------------------
-- BİR KEZLİK SEED — var olan ürünlerin models[] değerleri kaybolmasın.
-- Store/brand'e özel değil; her mağazadaki her markanın GERÇEK ürün
-- verisinden türetilen benzersiz model adları seed edilir. sort_order=0
-- hepsi için — admin "Markalar ve Modeller" ekranından istediği gibi
-- yeniden sıralayabilir, bu sadece "hiçbiri kaybolmasın" garantisi.
-- -----------------------------------------------------------------------------

insert into public.brand_models (store_id, brand_id, name, sort_order)
select distinct
  p.store_id,
  p.brand_id,
  trim(unnested.model_name),
  0
from public.products p
cross join lateral unnest(p.models) as unnested (model_name)
where p.brand_id is not null
  and p.models is not null
  and trim(unnested.model_name) <> ''
on conflict (brand_id, lower(name)) do nothing;
