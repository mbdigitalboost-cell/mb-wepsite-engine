-- =============================================================================
-- PLATFORM MIGRATION 0028
-- products.barcode — nullable, store-scoped-unique text (DRAFT)
--
-- FAZ 2C-6 STEP 25. Kaynak gereksinim formunda "Barkod" düz bir ÜRÜN
-- özelliği olarak listeleniyor (SKU/Model/Beden/Renk ile aynı flat liste,
-- ayrı bir "varyant alanları" bölümü altında değil) — bu yüzden
-- migration 0027_products_model_column.sql'in `model` kolonunda izlenen
-- kararla AYNI mantık: products seviyesinde, yeni tablo yok.
--
-- NEDEN products SEVİYESİNDE (product_variants DEĞİL) — AŞAMA 1'İN KENDİ
-- DEĞERLENDİRMESİ: `sku` zaten hem products'ta (migration 0017) hem
-- product_variants'ta (migration 0018) ayrı ayrı var — yani şema, "bir
-- ürünün kendi SKU'su" ile "bir varyantın kendi SKU'su"nu bilinçli olarak
-- ayırıyor. Barkod için kaynak doküman bu ayrımı YAPMIYOR — tek, düz bir
-- ürün alanı olarak isteniyor. Bu yüzden şimdilik SADECE products'a
-- ekleniyor; product_variants.barcode spekülatif bir eklenti olur (bkz.
-- bu migration'ın kapsamadığı, raporda ayrıca değerlendirilen karar).
--
-- UNIQUE KONVANSİYONU — MEVCUT ŞEMADAN KOPYALANDI, YENİ BİR DESEN İCAT
-- EDİLMEDİ: migration 0017'nin `products_sku_unique unique (store_id,
-- sku)` kararının BİREBİR aynısı. Postgres'te düz bir UNIQUE constraint
-- NULL'ları birbirinden FARKLI kabul eder (`sku`'nun bugün zaten kanıtladığı
-- davranış) — yani aynı store içinde birden fazla NULL barcode'lu ürün
-- SORUNSUZ bir arada durabilir; yalnızca İKİ dolu barkod aynı store içinde
-- ÇAKIŞAMAZ. Bu yüzden burada da AYRI bir partial unique index (`where
-- barcode is not null`) YOK — `products_sku_unique` gibi düz bir table
-- constraint yeterli ve mevcut konvansiyonla tutarlı. Ayrı bir
-- `products_barcode_idx` de YOK — sku için de böyle ayrı bir index yok
-- (0017'nin kendi index listesine bakınız), unique constraint'in kendi
-- örtük btree index'i sorgular için yeterli.
--
-- CROSS-STORE ÇAKIŞMA: unique (store_id, barcode) olduğu için İKİ FARKLI
-- store aynı barkod değerine sahip ürünler taşıyabilir — bu KASITLI ve
-- doğru (gerçek dünyada iki farklı mağaza aynı tedarikçiden aynı barkodlu
-- ürünü satabilir; store_id olmadan global unique olması gerçek bir
-- kısıtlama olurdu, buradaki tenant izolasyon modeliyle çelişirdi).
--
-- IDEMPOTENCY: `add column if not exists` — bu migration'ın kendisi
-- birden fazla kez elle çalıştırılırsa kolon eklemesi sessizce atlanır
-- (mevcut ürünleri bozmaz, veri kaybı yok). `add constraint` için Postgres
-- `IF NOT EXISTS` sözdizimini desteklemiyor — ikinci bir çalıştırma
-- constraint zaten varsa AÇIKÇA VE GÜVENLİ bir şekilde hata verir (sessiz
-- bozulma yok), bu repodaki her migration'ın zaten kabul ettiği tek-seferlik
-- uygulama modeliyle tutarlı.
--
-- Mevcut ürünleri bozmaz: kolon NULL default'lu (default'suz nullable text),
-- hiçbir NOT NULL/CHECK yok, hiçbir backfill gerekmiyor — bugünkü tek
-- gerçek satır olan "Taktikalp46 / t-1" test kaydı da dahil, her satırın
-- barcode'u otomatik NULL kalır.
--
-- Gereksiz CHECK/ENUM YOK — barkod farklı standartlarda (EAN-13, UPC-A,
-- Code128, üretici-özel) gelebileceği için hiçbir format kısıtlaması
-- eklenmedi; app-katmanında da sadece güvenli bir uzunluk sınırı var
-- (lib/validation/product.ts, max 100 — sku'nun mevcut max'ıyla aynı).
-- =============================================================================

alter table public.products
  add column if not exists barcode text;

comment on column public.products.barcode is
  'Nullable, store-scoped-unique product barcode (EAN/UPC/Code128/etc — no format enforced). FAZ 2C-6 STEP 25.';

alter table public.products
  add constraint products_barcode_unique unique (store_id, barcode);
