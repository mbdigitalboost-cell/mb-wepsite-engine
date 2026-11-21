-- =============================================================================
-- PLATFORM MIGRATION 0050 (VERİ DÜZELTMESİ — tek seferlik, tekrar çalıştırılabilir)
-- Faz 34 — varyant fiyatı "ürün fiyatını izler" (NULL) varsayılanı.
--
-- Faz 25/26'da varyant oluşturulurken ürün fiyatı varyanta KOPYALANIYORDU;
-- ürün fiyatı sonradan değişince renkler eski fiyatta kalıyordu. Kod artık
-- kopyalamıyor (NULL bırakıyor). Bu dosya yalnız fiyatı ürünün BUGÜNKÜ
-- fiyatına EŞİT olan varyantları NULL'a çeker (görünen fiyat değişmez,
-- yalnız bundan sonra ürün fiyatını izlerler). Farklı fiyatlı varyantlara
-- DOKUNMAZ — ör. Canik'in 2.000 TL'de kalan iki rengi (ürün 1.000 TL) bu
-- sorguyla değişmez; onlar için kullanıcı onayıyla ayrı satır aşağıda.
-- =============================================================================

-- Önce bakın (değişecek satırlar):
-- select p.name, v.sku, v.price, v.compare_at_price, p.price as product_price, p.compare_at_price as product_compare
-- from public.product_variants v join public.products p on p.id = v.product_id and p.store_id = v.store_id
-- where v.price is not null and v.price = p.price;

update public.product_variants v
set price = null,
    compare_at_price = null
from public.products p
where p.id = v.product_id
  and p.store_id = v.store_id
  and v.price is not null
  and v.price = p.price
  and (v.compare_at_price is null or v.compare_at_price = p.compare_at_price);

-- -----------------------------------------------------------------------------
-- YALNIZ KULLANICI ONAYLARSA (Canik renkleri ürün fiyatını izlesin: 1.000 / 3.000):
-- update public.product_variants v
-- set price = null, compare_at_price = null
-- from public.products p, public.stores s
-- where p.id = v.product_id and p.store_id = v.store_id and s.id = p.store_id
--   and s.slug = 'taktikalp46' and p.slug = 'canik-uyumlu-kydex-tabanca-kilifi-coyote';
-- -----------------------------------------------------------------------------

-- Doğrulama:
-- select p.name, v.sku, v.price, v.compare_at_price, p.price as product_price
-- from public.product_variants v join public.products p on p.id = v.product_id
-- order by p.name, v.sort_order;
