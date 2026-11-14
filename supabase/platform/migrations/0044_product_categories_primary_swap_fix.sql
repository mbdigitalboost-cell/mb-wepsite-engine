-- =============================================================================
-- PLATFORM MIGRATION 0044
-- product_categories — ana kategori değiştirme hatası düzeltmesi (Faz 27).
--
-- HATA (0043): Ana kategoriyi A'dan B'ye çevirmek her yoldan
-- "duplicate key value violates unique constraint product_categories_one_primary_idx"
-- veriyordu (admin ürün formunda ★ değiştirme / set_product_categories,
-- doğrudan is_primary UPDATE'i).
--   Sebep: BEFORE trigger (demote) A'yı is_primary=false yapıyor; bu iç UPDATE
--   kendi AFTER senkronunu (product_categories_sync_product) hemen tetikliyor.
--   O an B henüz ana olmadığı için senkron "ana yok → en eskiyi ana yap" diyip
--   A'yı geri yükseltiyor; ardından B'nin ana yapılması partial unique index'e
--   takılıyor.
-- DÜZELTME: demote, düşürme UPDATE'ini app.product_category_sync bayrağı
--   açıkken yapar; iç senkron atlanır. Aynayı (products.category_id) B satırının
--   kendi AFTER senkronu yazar. Zaten bir senkronun içindeyken bayrağa dokunmaz.
-- Yalnız tek fonksiyonu değiştirir; tablo, veri, policy, trigger tanımı aynı.
-- Doğrulama (Cowork, yerel Postgres 16 + 0043 birebir): faz27_kenar_durum_testi.sql
--   düzeltme öncesi 2. adımda bu hatayla düşüyor, sonrası 4/4 beklenen değer;
--   set_product_categories ile ana değiştirme ileri/geri, eski category_id yolu,
--   tüm kategorileri kaldırma (ayna NULL) ve yeni ürün insert'i de geçti.
-- =============================================================================

create or replace function public.product_categories_demote_other_primary()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.is_primary then
    return new;
  end if;

  if current_setting('app.product_category_sync', true) = 'on' then
    -- Zaten bir senkron işleminin içindeyiz: bayrağa dokunmadan düşür.
    update public.product_categories
      set is_primary = false
      where product_id = new.product_id and category_id <> new.category_id and is_primary;
    return new;
  end if;

  perform set_config('app.product_category_sync', 'on', true);
  update public.product_categories
    set is_primary = false
    where product_id = new.product_id and category_id <> new.category_id and is_primary;
  perform set_config('app.product_category_sync', 'off', true);
  return new;
end;
$$;

revoke all on function public.product_categories_demote_other_primary() from public, anon;
