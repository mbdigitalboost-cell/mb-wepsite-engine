-- =============================================================================
-- PLATFORM MIGRATION 0035
-- store-branding storage bucket — FAZ 10 (marka varlıkları: favicon +
-- header logosu). Migration 0020_product_images_storage.sql'in AYNI
-- tenant-aware storage.objects RLS desenini kullanır, ama BİLİNÇLİ OLARAK
-- FARKLI bir bucket'a, farklı bir public/private kararıyla.
--
-- ⚠️ NOT APPLIED YET — bu turdaki Supabase MCP bağlantısı koptuğu için bu
-- migration BU OTURUMDA apply_migration ile uygulanamadı/list_migrations
-- ile doğrulanamadı (kod tabanının kendi son numarası 0034; bu dosya
-- 0035 olarak seçildi ama gerçek üretim sırası MCP yeniden bağlandığında
-- list_migrations ile TEKRAR doğrulanmalı — bu repo'nun kendi 0023-0028
-- geçmişi zaten dosya adı numarasının gerçek uygulama sırasıyla birebir
-- örtüşmeyebileceğini gösteriyor). Uygulanana kadar logo/favicon yükleme
-- akışı ÇALIŞMAZ (bucket yok) — bkz. bu fazın kendi commit/rapor notu.
--
-- PUBLIC BUCKET (public=true) — migration 0020'nin `product-images`
-- bucket'ının TAM TERSİ karar, kasıtlı: bir favicon/logo tarayıcı
-- tarafından oturumsuz, önbelleğe alınarak, tekrar tekrar (her sayfa
-- yüklemesinde DEĞİL, günler/haftalar boyunca) okunur — Supabase Storage'ın
-- imzalı URL'i (createSignedUrl) SÜRELİ olduğu için bu kullanım için temelden
-- yanlış olurdu: bir <head> içine gömülü favicon linki, imza süresi
-- dolduğunda hiçbir tetikleyici olmadan sessizce kırılırdı. product-images
-- bucket'ının kendisi bu yüzden DEĞİŞTİRİLMEDİ (private kalmaya devam
-- ediyor, bu migration ona hiç dokunmuyor) — marka varlıkları için TAMAMEN
-- AYRI, yeni bir bucket açıldı.
--
-- YAZMA YETKİSİ store_admin+ (is_store_admin_member) — app/dashboard/.../
-- profile/actions.ts'in updateStoreProfileAction'ı zaten SADECE
-- requireStoreAdminAccess ile korunuyor (migration 0009), bu bucket'ın
-- kendi RLS'i o gerçek yetki sınırını storage.objects seviyesinde de
-- tekrarlıyor — "RLS asıl kapı, uygulama kontrolü cerrahi katman" ilkesinin
-- tersi değil, İKİ katmanın da AYNI tier'da olması gerektiği durum.
--
-- SELECT POLİTİKASI YOK: public bucket'ta anon GET'ler zaten RLS'i
-- bypass eden ayrı bir public-serving yolundan geçiyor (Supabase'in kendi
-- davranışı) — authenticated bir SELECT policy'sine bu fazda hiçbir
-- kod yolu ihtiyaç duymuyor (imzalı URL yok, admin önizlemesi doğrudan
-- store_profiles.logo_url/favicon_url'deki public URL'i kullanıyor) —
-- gereksiz yetki yüzeyi eklememek için bilinçli olarak atlandı.
--
-- extract_store_id_from_object_path() (migration 0020) BURADA DA
-- YENİDEN KULLANILIYOR — path şekli birebir aynı (`stores/{storeId}/...`),
-- fonksiyon aslında product-images'e özel değil, genel bir path-parser;
-- 0020'nin kendi yorumu "product-images bucket'ı dışında bir kullanım
-- amacı yok" diyordu, bu artık doğru değil — bu migration o iddiayı
-- güncelliyor, 0020'nin kendi dosyasına dokunmadan (migration dosyaları
-- tarihsel kayıt, geriye dönük değiştirilmez).
--
-- PATH: `stores/{storeId}/branding/{logo|favicon}.{ext}` — SABİT dosya adı
-- (ürün görsellerindeki gibi rastgele/benzersiz değil), her yeniden
-- yükleme `upsert: true` ile AYNI path'in üzerine yazıyor (bkz.
-- lib/commerce/upload-store-branding-asset.ts) — bir mağazanın en fazla
-- 1 logosu + 1 favicon'u olduğu için DB'de ayrı bir "eski dosyayı sil"
-- adımına gerek yok. Kabul edilen küçük istisna: admin farklı bir uzantı
-- (ör. önce .png sonra .webp) ile yeniden yüklerse eski dosya storage'da
-- öksüz kalır — marka varlıkları mağaza başına en fazla 2 dosya olduğu
-- için bu, ürün görselleri ölçeğindeki bir risk değil, temizlik mantığı
-- bilerek eklenmedi.
-- =============================================================================

comment on function public.extract_store_id_from_object_path(text) is
  'FAZ 2C-1B-1 (migration 0020) — storage.objects RLS policy''lerinin path''ten storeId çıkarması için kullanılan, exception-safe yardımcı. Yalnızca "stores/{storeId}/..." formatındaki path''ler için bir UUID döner; her türlü malformed/beklenmedik path için sessizce NULL döner, ASLA exception fırlatmaz. FAZ 10 (migration 0035) itibarıyla product-images bucket''ının YANI SIRA store-branding bucket''ı için de kullanılıyor — path şekli aynı, fonksiyon bucket''a özel değil.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-branding',
  'store-branding',
  true,
  2097152, -- 2 MiB — lib/commerce/store-branding-constants.ts'in kendi MAX_STORE_BRANDING_ASSET_SIZE_BYTES'ıyla eşleşmeli
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy store_branding_storage_insert_admin
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'store-branding'
    and (select public.is_store_admin_member(public.extract_store_id_from_object_path(name)))
  );

create policy store_branding_storage_update_admin
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'store-branding'
    and (select public.is_store_admin_member(public.extract_store_id_from_object_path(name)))
  )
  with check (
    bucket_id = 'store-branding'
    and (select public.is_store_admin_member(public.extract_store_id_from_object_path(name)))
  );

create policy store_branding_storage_delete_admin
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'store-branding'
    and (select public.is_store_admin_member(public.extract_store_id_from_object_path(name)))
  );
