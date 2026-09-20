-- =============================================================================
-- PLATFORM MIGRATION 0026
-- Taktikalp46 gerçek katalog — markalar (SEED, DRAFT)
--
-- FAZ 2C-4 STEP 23. Yeni tablo YOK — migration 0016_categories_brands.sql'in
-- mevcut `brands` tablosu (hiyerarşisiz, name/slug/description/logo_url/
-- is_active) bu üç markayı taşımaya zaten yeterli. Bu dosya SADECE veri
-- (insert), şema değişikliği yok. Aynı "hardcoded literal yerine sorgula"
-- güvenlik disiplini 0025_taktikalp46_catalog_categories.sql'deki gibi —
-- o dosyanın header'ındaki store_id doğrulama notu burada da GEÇERLİ,
-- tekrar edilmiyor.
--
-- Yalnızca kaynak gereksinim formunda DOĞRULANMIŞ üç marka — model listesi
-- YOK burada (bkz. FAZ 2C-4 STEP 23 raporunun "Model filtreleme kararı"
-- bölümü: model, brands'in altında ayrı bir tablo değil, products.model
-- nullable kolonu olarak çözüldü — migration 0027).
-- =============================================================================

with target_store as (
  select id
  from public.stores
  where id = '4bd25830-36df-406a-9828-8b1efcc83ea1'::uuid
    and name = 'Taktikalp46'
)
insert into public.brands (store_id, name, slug, is_active)
select ts.id, v.name, v.slug, true
from target_store ts
cross join (
  values
    ('CANİK', 'canik'),
    ('SARSILMAZ', 'sarsilmaz'),
    ('GLOCK', 'glock')
) as v (name, slug);
