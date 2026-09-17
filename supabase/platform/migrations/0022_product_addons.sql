-- =============================================================================
-- PLATFORM MIGRATION 0022
-- product_addons — FAZ 2C-2, opsiyonel ek parça / extra part sistemi
--
-- Depends on 0017 (products). FAZ 2C-2 pre-flight mimari tasarımının
-- (READY FOR IMPLEMENTATION kararı) birebir uygulanması.
--
-- VARYANT İLE KARIŞTIRILMAMALI: product_variants (migration 0018) ürünün
-- ANA KONFİGÜRASYONUNU tanımlar (örn. Renk=Siyah, Beden=L — kendi SKU/
-- fiyat/stok kimliği). product_addons ise ana ürüne EKLENEN opsiyonel bir
-- parça/hizmettir (örn. "Yan Cep +100") — fiyatı ana ürünün/variant'ın
-- fiyatını EZMEZ, price_delta olarak üstüne eklenir (server-authoritative
-- hesaplama için bkz. lib/commerce/pricing.ts, FAZ 2C-2'nin sonraki
-- adımı). Bu iki kavram bilinçli olarak ayrı tablolarda.
--
-- PRODUCT-SCOPED (P0 bilinçli tasarım kararı, option_groups'un migration
-- 0018'deki AYNI gerekçesiyle): bir add-on YALNIZCA TEK bir product'a
-- bağlıdır (product_id not null, doğrudan composite FK) — mağaza-geneli
-- paylaşımlı/global bir add-on kataloğu bu fazda YOK. Aynı "Yan Cep"i
-- birden fazla üründe yeniden kullanma ihtiyacı gerçek bir talep haline
-- gelirse, bu BUGÜNKÜ şemayı bozmadan bir `product_addon_links` junction
-- tablosuyla (many-to-many) ayrı bir migration'da eklenebilir — bugünkü
-- tek-product_id tasarımı bunu ENGELLEMİYOR, sadece bugün gerçek bir
-- ihtiyaç olmadığı için minimal tutuluyor.
--
-- TENANT GÜVENLİĞİ: composite FK (product_id, store_id) -> products(id,
-- store_id), NOT NULL + ON DELETE CASCADE — 0018'in option_groups/
-- product_variants'ıyla AYNI desen (0017'nin category_id/brand_id'sindeki
-- SET NULL + NOT NULL çakışma riski burada YOK, çünkü bu FK asla SET NULL
-- değil, her zaman CASCADE). Kesinlikle tek sütunlu (yalnızca product_id)
-- bir FK kullanılmadı — composite FK, cross-tenant bir product_id
-- atamasını (Store A add-on + Store B product) DB seviyesinde reddeder.
--
-- image_url: product_images'ın (migration 0019/0020) çoklu-görsel Storage
-- galerisine BİLİNÇLİ OLARAK dahil edilmedi — bir "Yan Cep"in çoklu açı
-- fotoğraf galerisine ihtiyacı yok. Tek, basit bir text alanı (categories.
-- image_url / brands.logo_url ile AYNI minimal desen), asla ham HTML/JS
-- olarak render edilmeyecek düz bir URL/path değeri — over-engineering'den
-- kaçınma.
--
-- is_required: bugün P0 UX'inin TAMAMI opsiyonel (müşteri add-on'u seçer
-- ya da seçmez) — bu alan bugün hiçbir yerde kullanılmıyor, sadece
-- gelecekteki "zorunlu add-on grubu" (min-seçim kuralı) genişlemesi için
-- ucuz, hazır bir temel. Bugün trigger/karmaşık group sistemi YOK.
--
-- QUANTITY YOK, COMPATIBILITY YOK: bu migration'ın bilinçli kapsamı
-- dışında — FAZ 2C-2 mimari tasarımının (READY FOR IMPLEMENTATION) kendi
-- kararı, ikisi de gelecekte additive (bu tabloyu bozmadan) eklenebilir.
--
-- sku: products_sku_unique / product_variants_sku_unique (migration
-- 0017/0018) ile BİREBİR AYNI desen — düz `unique (store_id, sku)`,
-- partial index DEĞİL. Postgres UNIQUE constraint'lerinde NULL değerler
-- birbirinden farklı sayılır (SQL standardı), yani `sku` NULL olan
-- sınırsız sayıda satır bu constraint'i asla ihlal etmez — "sku
-- kullanıldığında store seviyesinde çakışma engelle, kullanılmadığında
-- serbest bırak" davranışı EK bir partial index YAZMADAN zaten elde
-- ediliyor, mevcut iki tabloyla birebir aynı mekanizma, yeni bir desen
-- icat edilmedi.
--
-- order_items/cart: bu migration hiçbir sipariş/sepet tablosu
-- OLUŞTURMUYOR (talimatın kendi kapsam sınırı). Bir add-on ileride
-- silinirse geçmiş siparişlerin etkilenmemesi, o faz geldiğinde
-- order_items'ın kendi price/name SNAPSHOT alanlarıyla çözülecek — bu
-- tablonun canlı satırına bir FK ile değil.
-- =============================================================================

create table public.product_addons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null,
  name text not null,
  sku text,
  price_delta numeric(12, 2) not null default 0 check (price_delta >= 0),
  stock integer check (stock is null or stock >= 0),
  track_inventory boolean not null default true,
  image_url text,
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_addons_sku_unique unique (store_id, sku),
  constraint product_addons_id_store_id_unique unique (id, store_id),
  constraint product_addons_product_id_store_id_fkey
    foreign key (product_id, store_id) references public.products (id, store_id) on delete cascade
);

comment on table public.product_addons is
  'FAZ 2C-2: urune bagli opsiyonel ek parca/hizmet (ornek: Yan Cep +100). Product-scoped tasarim: her add-on yalnizca tek bir product_id degerine bagli, magaza geneli paylasimli/global katalog bu fazda yok (bkz. migration 0018, option_groups ayni bilincli minimal tasarimi kullanir). price_delta ana urun veya secili variant fiyatini ezmez, ustune fark olarak eklenir (server-authoritative hesaplama icin bkz. lib/commerce/pricing.ts). Variant (migration 0018) ile karistirilmamalidir: variant urunun ana konfigurasyonudur, add-on ise ana urune eklenen opsiyonel bir ek parcadir. Central Platform tek, cok-kiracili semasinda yasar, her store store_id ile izole edilir. Gelecekte magaza genelinde tekrar kullanilabilir/global add-on ihtiyaci dogarsa, bu semayi bozmadan bir junction tablosu ile eklenebilir.';

comment on column public.product_addons.price_delta is
  'Ana urun veya secili variant fiyatina eklenecek farktir, mutlak fiyat degildir. numeric(12,2) -- products.price ve product_variants.price ile ayni tip, parasal yuvarlama hatasindan kacinmak icin asla float/double kullanilmaz.';

comment on column public.product_addons.is_required is
  'Bugun P0 kapsaminda hicbir yerde kullanilmiyor, tum add-onlar opsiyoneldir. Gelecekteki zorunlu add-on grubu (minimum secim kurali) genislemesi icin ucuz, hazir bir temel saglar. Trigger veya karmasik grup sistemi bu migration kapsaminda degildir.';

comment on column public.product_addons.image_url is
  'Tek, basit gorsel referansidir -- categories.image_url ve brands.logo_url ile ayni minimal desendir. product_images tablosunun (migration 0019/0020) coklu-gorsel Storage galerisine bilincli olarak dahil edilmedi. Duz bir URL/path metnidir, asla ham HTML/JS olarak render edilmez.';

create trigger set_product_addons_updated_at
  before update on public.product_addons
  for each row execute function public.set_updated_at();

create index product_addons_store_id_idx on public.product_addons (store_id);
create index product_addons_product_sort_idx on public.product_addons (store_id, product_id, sort_order);
create index product_addons_product_active_sort_idx on public.product_addons (store_id, product_id, is_active, sort_order);

alter table public.product_addons enable row level security;

create policy product_addons_select_member_or_admin
  on public.product_addons for select
  to authenticated
  using ((select public.is_store_member(store_id)));

-- Public visibility requires BOTH this add-on's own is_active AND its
-- parent product's is_active — an add-on must never leak via anon SELECT
-- just because its own flag is true while the product itself is hidden.
-- Identical refinement to product_variants_select_public_active (migration
-- 0018) and product_images_select_public_active (migration 0019) — no new
-- security model invented here.
create policy product_addons_select_public_active
  on public.product_addons for select
  to anon
  using (
    is_active = true
    and (select public.is_store_publicly_visible(store_id))
    and exists (
      select 1 from public.products p
      where p.id = product_addons.product_id and p.is_active = true
    )
  );

create policy product_addons_insert_editor_tier
  on public.product_addons for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy product_addons_update_editor_tier
  on public.product_addons for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy product_addons_delete_admin_tier
  on public.product_addons for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));
