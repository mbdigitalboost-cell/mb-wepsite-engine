-- =============================================================================
-- PLATFORM MIGRATION 0025
-- Taktikalp46 gerçek katalog — kategoriler + alt kategoriler (SEED, DRAFT)
--
-- FAZ 2C-4 STEP 23. Yeni tablo YOK — migration 0016_categories_brands.sql'in
-- kendi parent/child (self-referencing `parent_id`) desteği bu ihtiyacı
-- birebir karşılıyor (bkz. o migration'ın kendi header'ı + mevcut admin
-- CRUD'ının "Üst Kategori" select'i, categories/category-form.tsx). Bu
-- dosya SADECE veri (insert), şema değişikliği yok.
--
-- HARDCODED store_id KONUSUNDA DÜRÜSTLÜK (kullanıcının bu turun kendi
-- talimatı: "mevcut migration konvansiyonu bunu güvenli şekilde
-- destekliyorsa yapılabilir, aksi durumda daha güvenli seed yaklaşımı
-- tasarla ve DURUP RAPORLA"):
--
-- Konvansiyon migration 0007_stores.sql'de VAR — Petra'nın customer_id'si
-- orada hardcoded, ama o değer AYNI TURDA canlı Platform DB'den doğrudan
-- iki kez sorgulanarak doğrulanmıştı (0007'nin kendi yorumu). BU TURDA
-- Supabase MCP bağlantısı YOK (ToolSearch ile doğrulandı, hiçbir
-- mcp__supabase* araç bulunamadı) — yani aşağıdaki store_id CANLI OLARAK
-- YENİDEN DOĞRULANAMADI. Tek kaynağı bu reponun kendi PROJECT_CONTEXT.md
-- dosyası (bu oturumun DAHA ÖNCEKİ bir fazında, Supabase bağlıyken canlı
-- olarak doğrulanıp yazılmış bir kayıt — "Completed: Central Platform
-- tenant/security foundation"):
--   Store ID: 4bd25830-36df-406a-9828-8b1efcc83ea1
--   Name: Taktikalp46
--
-- Bu, 0007'nin sahip olduğu güvenceden DAHA ZAYIF. Bu yüzden 0007'nin
-- aksine, burada DÜZ bir literal insert YOK — her insert, hedef store'u
-- id + name eşleşmesiyle SORGULAYARAK bulan bir `select ... from
-- public.stores where id = ... and name = 'Taktikalp46'` (target_store
-- CTE) üzerinden çalışıyor. Eğer bu ID yanlışsa / o satır artık yoksa /
-- isim değiştiyse, migration SESSİZCE 0 SATIR ekler (foreign-key/constraint
-- hatası vermez, başka bir store'un kataloğuna da YANLIŞLIKLA yazmaz) —
-- apply-time'da operatör satır sayısını (aşağıda beklenen: 12 kategori)
-- MUTLAKA doğrulamalı. Bu, DURUP RAPORLA gereğinin karşılığı: bu migration
-- PRODUCTION'a uygulanmadan önce store_id'nin Supabase bağlantısı geri
-- geldiğinde canlı olarak yeniden doğrulanması ÖNERİLİR.
--
-- KATEGORİ AĞACI (kullanıcının kaynak gereksinim formu, uydurma YOK):
--   SİLAH KILIFLARI (üst kategori)
--     ├─ ALÇAK TAŞIMA SİLAH KILIFLARI
--     ├─ İÇ TAŞIMA SİLAH KILIFLARI
--     ├─ HIZLI KUR AT SİLAH KILIFLARI
--     └─ YÜKSEK TAŞIMA SİLAH KILIFLARI
--   BIÇAK KILIFLARI, ŞARJÖR KILIFLARI, GİYİM, ÇANTA, PALASKA VE KEMER,
--   EDC VE GÜNLÜK TAŞIMA, KAMPANYALI ÜRÜNLER (hepsi üst-seviye, parent yok)
--
-- FAZ 2C-5 STEP 24 DÜZELTMESİ: önceki taslak (STEP 23), "HIZLI KUR AT
-- SİLAH KILIFLARI" ifadesini olası bir yazım hatası sayıp slug'ı
-- "hizli-kusanma-silah-kiliflari" olarak YORUMLAMIŞTI. Kullanıcı STEP
-- 24'te bunu AÇIKÇA REDDETTİ: "Kullanıcı metnini yorumlayıp değiştirme."
-- — kaynak metin harfi harfine doğru kabul edildi. Slug artık `name` ile
-- BİREBİR tutarlı: 'hizli-kur-at-silah-kiliflari'. Hiçbir yorumlama
-- yapılmadı.
--
-- Ürün YOK bu migration'da — kullanıcının açık talimatı: "elimizde tek
-- tek doğrulanabilir ürün isimleri yoksa seed etme."
-- =============================================================================

with target_store as (
  select id
  from public.stores
  where id = '4bd25830-36df-406a-9828-8b1efcc83ea1'::uuid
    and name = 'Taktikalp46'
)
insert into public.categories (store_id, name, slug, sort_order, is_active)
select ts.id, v.name, v.slug, v.sort_order, true
from target_store ts
cross join (
  values
    ('SİLAH KILIFLARI', 'silah-kiliflari', 10),
    ('BIÇAK KILIFLARI', 'bicak-kiliflari', 20),
    ('ŞARJÖR KILIFLARI', 'sarjor-kiliflari', 30),
    ('GİYİM', 'giyim', 40),
    ('ÇANTA', 'canta', 50),
    ('PALASKA VE KEMER', 'palaska-ve-kemer', 60),
    ('EDC VE GÜNLÜK TAŞIMA', 'edc-ve-gunluk-tasima', 70),
    ('KAMPANYALI ÜRÜNLER', 'kampanyali-urunler', 80)
) as v (name, slug, sort_order);

-- Alt kategoriler — parent_id, yukarıda eklenen 'silah-kiliflari' satırının
-- id'sini store_id + slug eşleşmesiyle bulan bir select ile çözülüyor (aynı
-- "hardcoded literal yerine sorgula" disiplini — 0016'nın kendi header'ının
-- işaret ettiği "parent_id aynı store'a ait mi" application-level kontrolüne
-- paralel, burada migration seviyesinde).
insert into public.categories (store_id, parent_id, name, slug, sort_order, is_active)
select parent.store_id, parent.id, v.name, v.slug, v.sort_order, true
from public.categories parent
cross join (
  values
    ('ALÇAK TAŞIMA SİLAH KILIFLARI', 'alcak-tasima-silah-kiliflari', 10),
    ('İÇ TAŞIMA SİLAH KILIFLARI', 'ic-tasima-silah-kiliflari', 20),
    ('HIZLI KUR AT SİLAH KILIFLARI', 'hizli-kur-at-silah-kiliflari', 30),
    ('YÜKSEK TAŞIMA SİLAH KILIFLARI', 'yuksek-tasima-silah-kiliflari', 40)
) as v (name, slug, sort_order)
where parent.store_id = '4bd25830-36df-406a-9828-8b1efcc83ea1'::uuid
  and parent.slug = 'silah-kiliflari';
