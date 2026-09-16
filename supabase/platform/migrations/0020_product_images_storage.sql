-- =============================================================================
-- PLATFORM MIGRATION 0020
-- product_images storage — FAZ 2C-1B-1, tenant-aware Storage bucket + RLS
--
-- FAZ 2C-1 (migration 0019) `product_images.storage_path` alanını zaten bir
-- Supabase Storage bucket path'i olarak tasarlamıştı ama hiçbir bucket
-- OLUŞTURMAMIŞTI (0019'un kendi header yorumu: "bucket kurulumu bu migration
-- setinin kapsamı dışında bırakıldı"). Bu migration o bucket'ı — ve ona
-- eşlik eden `storage.objects` RLS'ini — ekliyor.
--
-- BİLİNÇLİ OLARAK `supabase/customer-template/`'DEKİ 0006_media_storage_bucket.sql
-- İLE AYNI DESEN DEĞİL: 0006, her müşterinin KENDİ AYRI Supabase projesine
-- uygulanan bir template — public bucket, storage.objects'te HİÇ policy yok
-- (her yazma service-role ile, RLS'i tamamen bypass ederek yapılıyor, bkz. o
-- dosyanın kendi yorumu). Central Platform'un `stores` mimarisi FARKLI: TEK
-- bir Supabase projesinde (bu proje) BİRDEN FAZLA store/tenant bir arada
-- yaşıyor ve her yazma `createSupabaseServerClient()` (anon key + kullanıcı
-- oturumu) üzerinden, tablo RLS'lerine (migration 0016-0019'daki
-- is_store_editor_member/is_store_admin_member policy'leri) GERÇEKTEN
-- DAYANARAK yapılıyor — service-role bypass YOK. Bu yüzden bu bucket'ın
-- kendisi de storage.objects üzerinde GERÇEK, tenant-aware RLS policy'lerine
-- ihtiyaç duyuyor; 0006'nın "policy'siz, service-role-only" deseni burada
-- KOPYALANAMAZ (kopyalansaydı, herhangi bir authenticated store_editor
-- teorik olarak storage.objects'te BAŞKA bir store'un path'ine
-- yazabilirdi/silebilirdi — bkz. FAZ 2C-1B audit raporu §B).
--
-- BUCKET PRIVATE (public=false): gelecekteki public storefront için signed
-- URL kullanılacak (FAZ 2C-1B preflight kararı) — migration 0019'un kendi
-- RLS'i zaten "pasif (is_active=false) bir ürünün görselleri anon'a hiç
-- görünmesin" ilkesini DB seviyesinde koruyor (product_images_select_public_active);
-- bucket public olsaydı, URL'i bilen herkes DB RLS'ini bypass ederek dosya
-- byte'larına erişebilirdi. Private bucket bu sızıntı riskini ortadan kaldırıyor.
--
-- SVG BİLİNÇLİ OLARAK ALLOWLIST'TE YOK (0006'nın media bucket'ının aksine) —
-- SVG bir XML formatı olduğu için <script>/olay-handler içerebilir (stored
-- XSS riski, bkz. FAZ 2C-1B audit §G); ürün fotoğrafları zaten SVG formatında
-- olmaz, bu yüzden risk almanın hiçbir faydası yok.
--
-- PATH KONVANSİYONU: `stores/{storeId}/products/{productId}/{filename}` —
-- storeId path'in 2. segmentinde SABİT bir konumda, bu da
-- extract_store_id_from_object_path()'in onu güvenle çıkarabilmesini
-- sağlıyor. Bu bucket YALNIZCA bu path formatı için kullanılacak (TEK
-- AMAÇLI — media bucket'ıyla PAYLAŞILMIYOR); yine de aşağıdaki helper
-- fonksiyon, path malformed olsa bile ASLA exception fırlatmayacak şekilde
-- (güvenli varsayılan: NULL) yazıldı — ikinci bir savunma katmanı.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: bir storage.objects path'inden storeId'yi GÜVENLE çıkarır.
-- -----------------------------------------------------------------------------

create or replace function public.extract_store_id_from_object_path(object_name text)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  segments text[];
begin
  -- storage.foldername() bir object path'inin KLASÖR kısmını (son
  -- dosya-adı segmenti HARİÇ) bir text[] olarak döner — Supabase Storage'ın
  -- kendi belgelenmiş yardımcı fonksiyonu, burada yeniden tanımlanmıyor.
  -- "stores/{storeId}/products/{productId}/dosya.webp" için:
  --   segments = {stores, {storeId}, products, {productId}}
  segments := storage.foldername(object_name);

  if segments is null or array_length(segments, 1) < 2 or segments[1] != 'stores' then
    return null;
  end if;

  return segments[2]::uuid;
exception
  -- Geçersiz bir UUID string'i (::uuid cast'i başarısız olursa) burada
  -- YAKALANIYOR ve NULL'a çevriliyor — çağıran RLS policy'sinin bir
  -- SQL exception ile PATLAMASI yerine, aşağıdaki is_store_*_member(NULL)
  -- çağrısı doğal olarak `false` (platform admin hariç) döner: güvenli
  -- varsayılan-red, hata değil.
  when invalid_text_representation then
    return null;
end;
$$;

comment on function public.extract_store_id_from_object_path(text) is
  'FAZ 2C-1B-1 — storage.objects RLS policy''lerinin path''ten storeId çıkarması için kullanılan, exception-safe yardımcı. Yalnızca "stores/{storeId}/..." formatındaki path''ler için bir UUID döner; her türlü malformed/beklenmedik path (eksik segment, yanlış prefix, geçersiz UUID) için sessizce NULL döner, ASLA exception fırlatmaz. product-images bucket''ı dışında bir kullanım amacı yok.';

-- Yeni bir fonksiyon Postgres'te varsayılan olarak PUBLIC'e (dolayısıyla
-- anon'a da) EXECUTE hakkı alır — migration 0012/0013'ün is_store_member/
-- is_store_editor_member/is_store_admin_member için SONRADAN düzeltmek
-- zorunda kaldığı TAM OLARAK bu boşluk. Burada aynı hatayı baştan
-- yapmıyoruz: PUBLIC'ten (dolayısıyla anon'dan) hemen revoke edip yalnızca
-- authenticated + service_role'e açıkça geri veriyoruz — 0012'nin kendi
-- 3 kardeş fonksiyonuyla BİREBİR aynı nihai durum. `authenticated`'e EXECUTE
-- verilmesi ZORUNLU: aşağıdaki policy'ler `to authenticated` çalışıyor ve bu
-- fonksiyonu ÇAĞIRMASI gerekiyor — SECURITY DEFINER yalnızca fonksiyonun
-- GÖVDESİNİN hangi rolün yetkileriyle çalıştığını belirler, çağıran rolün
-- fonksiyonu ÇAĞIRABİLMESİ için yine de kendi EXECUTE hakkına ihtiyacı
-- vardır — bu yüzden `authenticated`'den de revoke etmek policy'leri
-- BOZARDI (her çağrı "permission denied for function" ile patlardı).
-- anon'a hiç grant verilmiyor çünkü hiçbir policy `to anon` çalışmıyor
-- (bucket private, aşağıda anon policy'si yok).
revoke execute on function public.extract_store_id_from_object_path(text) from public;
grant execute on function public.extract_store_id_from_object_path(text) to authenticated;
grant execute on function public.extract_store_id_from_object_path(text) to service_role;

-- -----------------------------------------------------------------------------
-- Bucket
-- -----------------------------------------------------------------------------

-- `on conflict (id) do nothing` — 0006_media_storage_bucket.sql ile AYNI
-- idempotency deseni: bu migration'ın yanlışlıkla iki kez çalıştırılması
-- (veya bucket'ın Dashboard'dan elle daha önce oluşturulmuş olması) bir
-- hataya değil, sessiz bir no-op'a yol açar. NOT: bucket zaten VARSA ama
-- FARKLI ayarlarla (ör. public=true, farklı file_size_limit) oluşturulmuşsa,
-- bu ifade mevcut ayarları GÜNCELLEMEZ (`do nothing`, `do update` değil) —
-- bilinçli bir tercih: bir bucket'ın güvenlik-kritik ayarlarının (public/
-- private, mime allowlist) bir migration tarafından SESSİZCE üzerine
-- yazılması yerine, böyle bir çakışma varsa migration'ı uygulayan kişinin
-- bunu FARK EDİP elle çözmesi tercih edildi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- storage.objects policies — SADECE 'product-images' bucket'ı için.
-- storage.objects'te RLS Supabase tarafından zaten varsayılan olarak aktif
-- (bkz. 0006_media_storage_bucket.sql'in kendi yorumu) — burada ayrıca bir
-- `alter table storage.objects enable row level security` GEREKMİYOR.
--
-- Her policy `bucket_id = 'product-images'` ile başlıyor — böylece bu
-- policy'ler `media` bucket'ı (customer-template, farklı proje) dahil
-- HİÇBİR BAŞKA bucket'ı etkilemiyor; migration 0016-0019'daki tablo
-- RLS'leriyle AYNI 3 katmanlı model (member/editor/admin), AYNI
-- `(select ...)` initPlan-caching deseni (migration 0008'in kendi
-- performans notuyla aynı gerekçe).
-- -----------------------------------------------------------------------------

create policy product_images_storage_select_member
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_store_member(public.extract_store_id_from_object_path(name)))
  );

create policy product_images_storage_insert_editor
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select public.is_store_editor_member(public.extract_store_id_from_object_path(name)))
  );

create policy product_images_storage_update_editor
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_store_editor_member(public.extract_store_id_from_object_path(name)))
  )
  with check (
    bucket_id = 'product-images'
    and (select public.is_store_editor_member(public.extract_store_id_from_object_path(name)))
  );

create policy product_images_storage_delete_admin
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_store_admin_member(public.extract_store_id_from_object_path(name)))
  );
