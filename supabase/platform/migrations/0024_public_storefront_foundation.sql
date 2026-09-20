-- =============================================================================
-- PLATFORM MIGRATION 0024 (DRAFT — NOT YET APPLIED)
-- FAZ 2C-3 — public storefront foundation: store resolution view +
-- variant/option anon read access.
--
-- SCOPE — bu migration SADECE iki şeyi ekliyor:
--   1) public.store_public_stores — stores tablosunun public-safe
--      projeksiyonu (id/name/slug/status), store_public_settings
--      (migration 0009) ile BİREBİR AYNI desen.
--   2) option_groups / option_values / variant_option_values için anon
--      SELECT policy — migration 0018'in KENDİ header yorumunun açıkça
--      belirttiği, o zaman bilinçli olarak eklenmemiş ("bunlar sadece
--      admin/configurator UI'ı tarafından kullanılıyor, storefront
--      render'ı product_variants/product_images üzerinden zaten yeterli
--      veriye sahip") — storefront şimdi gerçekten bir configurator
--      inşa ettiği için bu eksik kapatılıyor, DB'nin geri kalanı
--      DEĞİŞMİYOR.
--
-- BİLİNÇLİ OLARAK BU MIGRATION'A DAHİL EDİLMEYEN ŞEYLER:
--   - categories/brands/products/product_variants/product_images/
--     product_addons için YENİ bir policy YOK — bunların hepsi zaten
--     KENDİ `_select_public_active` anon policy'sine sahip (migration
--     0016/0017/0018/0019/0022), storefront bunları OLDUĞU GİBİ
--     kullanabilir. Doğrulama: FAZ 2C-3 STEP 22'nin kendi read-only kod
--     denetiminde teyit edildi.
--   - `product-images` Storage bucket'ına (migration 0020) yeni bir anon
--     policy YOK — bilinçli bir tercih, aşağıdaki "STORAGE / SIGNED URL"
--     notuna bakın.
--
-- STORAGE / SIGNED URL: `product-images` bucket'ının storage.objects RLS'i
-- (migration 0020) SADECE `product_images_storage_select_member`
-- (authenticated, is_store_member) policy'sine sahip — anon için HİÇBİR
-- storage.objects SELECT policy'si yok. Bu migration buna YENİ bir anon
-- storage policy EKLEMİYOR (Storage RLS'i genişletmek, bu "foundation"
-- turunun kapsamı dışında bırakılan, ayrı bir onay gerektiren bir
-- güvenlik-yüzeyi kararı). Bunun yerine `lib/commerce/public/products.ts`
-- signed URL üretimi için `createSupabaseAdminClient()` (service-role)
-- kullanıyor — SADECE `product_images_select_public_active` RLS'i
-- (migration 0019, zaten var) tarafından anon'a görünür olduğu ÖNCEDEN
-- doğrulanmış satırlar için, yani service-role burada bir görünürlük
-- kontrolünü BYPASS ETMİYOR, sadece o satırın storage_path'i için son
-- adım olan imzalama işlemini yapıyor. Bkz. o dosyanın kendi yorumu.
--
-- CROSS-STORE İZOLASYONU: aşağıdaki 3 policy de kendi tablosunun KENDİ
-- store_id sütununu `is_store_publicly_visible(store_id)` ile kontrol
-- ediyor — migration 0018'deki composite FK'ler zaten bir satırın
-- store_id'sinin gerçek sahibiyle eşleştiğini garanti ediyor, bu
-- policy'ler SADECE "bu satırın kendi store'u herkese açık mı + üst
-- ürün/varyant aktif mi" sorusunu cevaplıyor, başka store'un verisine
-- hiçbir şekilde erişim vermiyor.
--
-- BU DOSYA SADECE TASLAK — FAZ 2C-3 STEP 22'nin kendi talimatı gereği
-- production'a APPLY EDİLMEDİ. Migration 0023'e (revoke_trigger_function_exec)
-- dokunulmadı, bu dosya ondan tamamen bağımsız.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- store_public_stores — migration 0009'un store_public_settings view'ıyla
-- BİREBİR AYNI desen: security_invoker=false (view sahibi olarak çalışır,
-- stores'un KENDİ RLS'ini bypass eder — ki zaten stores'ta hiç anon SELECT
-- policy'si yok), ama status='active' filtresi VIEW TANIMININ KENDİSİNDE
-- (RLS'e değil) — pasif/silinmiş bir mağaza hiçbir zaman bu view'dan da
-- sızmaz. SADECE id/name/slug/status — customer_id, supabase_connection_key
-- gibi hiçbir private/internal alan projeksiyona DAHİL EDİLMEDİ.
-- -----------------------------------------------------------------------------

create view public.store_public_stores
  with (security_invoker = false)
  as
  select
    id,
    name,
    slug,
    status
  from public.stores
  where status = 'active';

comment on view public.store_public_stores is
  'Public-safe projection of stores — SADECE id/name/slug/status, ASLA customer_id/supabase_connection_key/diğer internal alanlar. security_invoker=false ile stores''un (anon SELECT policy''si hiç olmayan) RLS''ini bypass eder ama SADECE status=''active'' satırları döndürür — bu satır filtresi view tanımının kendisinde, RLS''e değil (migration 0009''un store_public_settings''iyle birebir aynı desen). lib/commerce/public/store.ts''in getStoreBySlug()''ı bu view''ı kullanır, asla stores tablosunu doğrudan değil.';

-- -----------------------------------------------------------------------------
-- option_groups — anon SELECT. Migration 0018'in kendi tasarım kararının
-- (o zaman "storefront'un buna ihtiyacı yok" varsayımıyla eklenmemiş)
-- şimdi gerçek bir storefront configurator'ı için genişletilmesi. Kendi
-- is_active kolonu yok (migration 0018'in kendi gerekçesi: dashboard-only
-- olduğu için hiç gerekmedi) — görünürlük tamamen üst ürünün is_active
-- durumuna bağlı, product_images_select_public_active ile AYNI desen.
-- -----------------------------------------------------------------------------

create policy option_groups_select_public_active
  on public.option_groups for select
  to anon
  using (
    (select public.is_store_publicly_visible(store_id))
    and exists (
      select 1 from public.products p
      where p.id = option_groups.product_id and p.is_active = true
    )
  );

-- -----------------------------------------------------------------------------
-- option_values — anon SELECT. option_values'ın kendi product_id'si yok
-- (sadece option_group_id) — bu yüzden görünürlük iki adımlı: kendi
-- option_group'u ÜZERİNDEN üst ürünün is_active durumuna bakılıyor.
-- -----------------------------------------------------------------------------

create policy option_values_select_public_active
  on public.option_values for select
  to anon
  using (
    (select public.is_store_publicly_visible(store_id))
    and exists (
      select 1
      from public.option_groups og
      join public.products p on p.id = og.product_id
      where og.id = option_values.option_group_id and p.is_active = true
    )
  );

-- -----------------------------------------------------------------------------
-- variant_option_values — anon SELECT. Junction tablo, kendi is_active'i
-- yok — görünürlük hem varyantın hem üst ürünün is_active durumuna bağlı,
-- product_variants_select_public_active'in kendi "hem kendi is_active hem
-- üst ürünün is_active'i" ilkesiyle AYNI.
-- -----------------------------------------------------------------------------

create policy variant_option_values_select_public_active
  on public.variant_option_values for select
  to anon
  using (
    (select public.is_store_publicly_visible(store_id))
    and exists (
      select 1
      from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = variant_option_values.variant_id
        and v.is_active = true
        and p.is_active = true
    )
  );
