-- =============================================================================
-- PLATFORM MIGRATION 0027
-- products.model — nullable free-text model attribute (DRAFT)
--
-- FAZ 2C-4 STEP 23, AŞAMA 4 kararı. Taktikalp46'nın silah kılıfı
-- kategorisinde marka + model bazlı filtreleme isteği (ör. CANİK / TP9 SFx)
-- için minimal şema değişikliği.
--
-- DEĞERLENDİRİLEN ÜÇ SEÇENEK (rapor talebi gereği, kısaca burada da):
--   1. products.model nullable text kolonu            -> SEÇİLDİ
--   2. option_groups/option_values (variant sistemi)  -> REDDEDİLDİ
--   3. Yeni bir "product_models" tablosu / EAV / JSONB -> REDDEDİLDİ
--
-- NEDEN (2) REDDEDİLDİ: migration 0018_product_variants_options.sql'in
-- kendi header'ının da belirttiği gibi option_groups/option_values ÜRÜN
-- BAZLI (her ürün kendi grubunu tanımlar) ve amacı bir ürünün SATILABİLİR
-- varyasyonlarını (aynı ürünün Kırmızı/Mavi, S/M/L hâli) üretmek — bir
-- ÜRÜNÜN KENDİ satır sayısını çoğaltan bir mekanizma. "Model" burada
-- KATALOG GENELİNDE bir FİLTRELEME EKSENİ (hangi silah modeline uygun) —
-- kavramsal olarak farklı bir eksen, variant sistemine zorlanması yanlış
-- soyutlama (bir kılıf ürününün "TP9 SFx variant'ı" diye bir şey yok,
-- kılıf ZATEN belirli bir modele göre üretilmiş tek bir üründür).
--
-- NEDEN (3) REDDEDİLDİ: bu turun kendi talimatı ("yeni attribute engine
-- yazma, EAV sistemi oluşturma, JSONB ile rastgele filtre sistemi kurma")
-- + bugün yalnızca 3 marka / ~16 bilinen model var — ayrı bir tabloyla
-- referans bütünlüğü kazanılır ama bu ölçekte gerçek bir ihtiyaç değil
-- (YAGNI). Marka zaten kendi tablosunda (brands) olduğu için brand_id
-- referansı bozulmuyor; sadece "hangi model" düz bir metin etiketi.
--
-- DB SEVİYESİNDE ENFORCE EDİLMEYEN (bilinçli, kabul edilen boşluk): model
-- değerinin kaynak formdaki listeyle (CANİK: TP9 SFx, TP9 SFx Mod.2, ...)
-- eşleşmesi burada CHECK/enum ile zorlanmıyor — ileride ürün formuna bu
-- alan eklendiğinde (bu turda eklendi, bkz. product-form.tsx) admin
-- serbest metin girebilir. Ölçek büyürse (yeni markalar/modeller sıkça
-- eklenirse) bu, nullable brand_id'li ayrı bir "product_models" tablosuna
-- yükseltilebilir — bugünkü şema bunu ENGELLEMİYOR, sadece bugün
-- kurmuyor.
--
-- Composite/tenant FK gerekmiyor: model, store_id'ye bağlı bir ilişki
-- değil, ürünün kendi satırının bir alanı — categories/brands'in aksine
-- cross-store injection riski taşımıyor.
-- =============================================================================

alter table public.products
  add column model text;

comment on column public.products.model is
  'Nullable free-text model attribute (e.g. "TP9 SFx") for brand/model storefront filtering. No FK/dictionary table — see this migration''s own header for why. FAZ 2C-4 STEP 23.';

-- brand_id + model birlikte filtrelenecek (storefront'un gelecekteki
-- "CANİK > TP9 SFx" filtresi) — index bu iki sütunu store_id ile birlikte
-- kapsıyor, mevcut products_brand_id_idx (store_id, brand_id) deseniyle
-- tutarlı.
create index products_brand_model_idx on public.products (store_id, brand_id, model);
