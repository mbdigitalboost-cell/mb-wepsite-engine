-- =============================================================================
-- PLATFORM MIGRATION 0006
-- Expand app_role — DATA MIGRATION + CHECK constraint + indexes + RLS functions
--
-- ÖN KOŞUL: 0005_expand_roles_enum.sql bu migration'dan ÖNCE, AYRI bir
-- transaction olarak commit edilmiş olmalı (bkz. o dosyanın yorumu —
-- aksi halde bu dosyadaki UPDATE satırları "unsafe use of new value"
-- hatasıyla başarısız olur; bu, bu oturumda canlı veritabanına karşı
-- güvenli bir rollback'li transaction ile EMPİRİK olarak doğrulandı).
--
-- PHASE 1 (Commerce Platform genişlemesi) — PHASE_0 audit raporunun
-- Authorization/RBAC bölümünde önerilen genişleme. Bugün gerçekte var
-- olan iki hesap (bir platform admin, bir Petra customer kullanıcısı)
-- davranış olarak TAMAMEN AYNI KALACAK şekilde taşınıyor:
--
--   admin    → platform_admin  (bugünkü "admin" ile birebir aynı yetki:
--                                customer_id NULL, her müşteriyi görür)
--   customer → store_admin     (bugünkü "customer" ile birebir aynı
--                                yetki: tek bir customer_id'ye bağlı)
--
-- Bu iki UPDATE'in canlı veritabanındaki tam olarak hangi 2 satırı
-- etkileyeceği bu oturumda doğrudan sorgulanarak doğrulandı:
--   customer_users.id = d7fe5d74-... (user mbdigitalboost@gmail.com, role=admin, customer_id=NULL)
--   customer_users.id = 284759e5-... (user petramuhendislik@mbdigitalboost.com, role=customer, customer_id=55bf2f5c-...)
-- Başka hiçbir satır yok — bu iki UPDATE'in etki alanı tam olarak bu 2
-- satırla sınırlı.
--
-- super_admin / store_editor / store_viewer bu migration'da HİÇBİR
-- satıra ATANMIYOR ve hiçbir yeni davranışa bağlanmıyor — sadece ileride
-- enum'da hazır bulunuyorlar. Kullanılmadıkları sürece sıfır ek
-- davranış/risk taşırlar.
--
-- DÜRÜSTLÜK NOTU — GERİ ALINABİLİRLİK: Postgres enum'dan değer silmeyi
-- desteklemediği için 'admin'/'customer' etiketleri enum'da sonsuza dek
-- kalacak (0005'ten miras) — ama bu migration'dan sonra hiçbir satır,
-- hiçbir fonksiyon, hiçbir kod yolu onlara referans vermeyecek (bkz.
-- lib/auth/roles.ts — sadece geriye dönük uyumluluk için hâlâ
-- tanınıyorlar). Bu migration'ın geri kalanı TAM GERİ ALINABİLİR:
-- aşağıdaki UPDATE'in tersini çalıştırıp (platform_admin → admin,
-- store_admin → customer) ve CHECK constraint'i / is_platform_admin() /
-- is_customer_member() fonksiyonlarını 0004'teki haline döndürerek eski
-- davranışa dönülebilir.
--
-- BU DOSYADAKİ HER ADIM, bu oturumda canlı projeye karşı (ROLLBACK'li,
-- kalıcı hiçbir etkisi olmayan bir transaction içinde, gerçek veriyle
-- birebir eşleşen bir mimic tabloda) test edildi:
--   - UPDATE'ler doğru satırları doğru yeni role taşıyor.
--   - CHECK constraint hem 2 eski hem 5 yeni rolü doğru kabul/reddediyor
--     (admin-ailesi + customer_id NOT NULL → RED; store-ailesi +
--     customer_id NULL → RED; her iki aile de doğru customer_id
--     durumunda → KABUL).
--   - is_platform_admin()/is_customer_member() mantığı platform_admin,
--     store_admin, store_editor, store_viewer, super_admin için doğru
--     true/false döndürüyor VE cross-tenant izolasyon çalışıyor (bir
--     müşterinin store_admin'i başka bir müşteriye member sayılmıyor).
-- =============================================================================

update public.customer_users set role = 'platform_admin' where role = 'admin';
update public.customer_users set role = 'store_admin' where role = 'customer';

-- CHECK constraint'i yeni rol ailelerine göre genişlet. Eski isimler de
-- constraint'te bırakılıyor (enum'da hâlâ var olabilecekleri için) ama
-- migration'dan sonra hiçbir satır onlarla eşleşmeyecek.
alter table public.customer_users drop constraint customer_users_role_scope_check;
alter table public.customer_users add constraint customer_users_role_scope_check check (
  (role in ('admin', 'super_admin', 'platform_admin') and customer_id is null)
  or (role in ('customer', 'store_admin', 'store_editor', 'store_viewer') and customer_id is not null)
);

-- Partial unique index'leri yeni "admin-eşdeğeri" / "store-eşdeğeri" rol
-- kümelerini kapsayacak şekilde yeniden oluştur (0002'deki niyet aynen
-- korunuyor: bir kullanıcının en fazla bir admin-eşdeğeri satırı, ve bir
-- müşteri başına en fazla bir store-eşdeğeri satırı olabilir).
drop index public.customer_users_one_admin_row_per_user;
create unique index customer_users_one_admin_row_per_user
  on public.customer_users (user_id)
  where role in ('admin', 'super_admin', 'platform_admin');

drop index public.customer_users_one_row_per_customer_per_user;
create unique index customer_users_one_row_per_customer_per_user
  on public.customer_users (customer_id, user_id)
  where role in ('customer', 'store_admin', 'store_editor', 'store_viewer');

-- RLS'in gerçek kalbi: is_platform_admin() artık yeni admin-eşdeğeri
-- rolleri de tanıyor. CREATE OR REPLACE — fonksiyonun kimliği/izinleri
-- korunuyor, sadece gövdesi güncelleniyor. SECURITY DEFINER /
-- search_path / STABLE aynen 0004'teki gibi korunuyor.
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.customer_users
    where user_id = auth.uid()
      and role in ('admin', 'super_admin', 'platform_admin')
  );
$$;

comment on function public.is_platform_admin() is
  'True if the currently authenticated user (auth.uid()) has a global admin-equivalent row (super_admin/platform_admin, or the legacy admin label) in customer_users.';

create or replace function public.is_customer_member(target_customer_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.customer_users
      where user_id = auth.uid()
        and role in ('customer', 'store_admin', 'store_editor', 'store_viewer')
        and customer_id = target_customer_id
    );
$$;

comment on function public.is_customer_member(uuid) is
  'True if the currently authenticated user belongs to the given customer with any store-equivalent role (store_admin/store_editor/store_viewer, or the legacy customer label), or is a platform admin.';

-- NOT: is_customer_member() bilinçli olarak store_editor/store_viewer'ı
-- store_admin'den ayırmıyor — RLS seviyesinde üçü de "bu müşteriye ait"
-- sayılıyor (ör. Platform DB'deki customers/websites/stores satırlarını
-- GÖREBİLİRLER). "store_viewer YAZAMAZ" kuralı RLS'te değil, uygulama
-- katmanında (requireCustomerWriteAccess, bkz.
-- lib/auth/require-customer-access.ts) uygulanıyor — çünkü asıl site
-- içeriği (hero/solutions/leads/...) tamamen ayrı bir müşteri Supabase
-- projesinde yaşıyor ve platform RLS'in hiç görmediği bir yerde. Bu,
-- Phase 1 raporunda AÇIKÇA belirtilmesi gereken bir mimari sınır.
