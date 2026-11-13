-- =============================================================================
-- PLATFORM MIGRATION 0041
-- Taktikalp46 — yeni üst kategori: BEL KLİPSLERİ VE TOKALAR (SEED, veri)
--
-- Faz 24. Şema değişikliği yok, tek satır insert. Admin panelinden değil
-- migration ile: slug'ın TAM OLARAK 'bel-klipsleri-ve-tokalar' olması
-- gerekiyor (storefront'un statik görsel yedeği slug'dan türetiliyor —
-- lib/commerce/public/category-fallback-images.ts → /images/categories/
-- bel-klipsleri-ve-tokalar.jpg) ve Türkçe büyük İ harfi slug üreticisinde
-- sapma yaratabilir.
--
-- Hedef mağaza 0025'teki gibi id + name eşleşmesiyle SORGULANARAK bulunur
-- (literal store_id tek başına kullanılmaz); 2026-11-13'te canlı DB'den
-- doğrulandı: 4bd25830-36df-406a-9828-8b1efcc83ea1 / Taktikalp46, EDC 70,
-- KAMPANYALI ÜRÜNLER 80 → sort_order 75 aralarına düşer.
--
-- İdempotent: categories_slug_unique (store_id, slug) üzerinde
-- `on conflict do nothing` — tekrar çalışırsa mükerrer satır üretmez.
-- image_url NULL: görsel statik yedekten gelir (GEÇİCİ, gerçek ürün
-- fotoğrafı değil; gerçek fotoğraf gelince dosya değiştirilecek).
-- =============================================================================

insert into public.categories (store_id, parent_id, name, slug, sort_order, is_active, image_url)
select s.id, null, 'BEL KLİPSLERİ VE TOKALAR', 'bel-klipsleri-ve-tokalar', 75, true, null
from public.stores s
where s.id = '4bd25830-36df-406a-9828-8b1efcc83ea1'
  and s.name = 'Taktikalp46'
on conflict (store_id, slug) do nothing;
