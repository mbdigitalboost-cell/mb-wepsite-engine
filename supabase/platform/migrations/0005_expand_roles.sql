-- =============================================================================
-- PLATFORM MIGRATION 0005
-- Expand app_role: admin/customer → super_admin/platform_admin/store_admin/store_editor/store_viewer
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
-- super_admin / store_editor / store_viewer bu migration'da HİÇBİR
-- satıra ATANMIYOR ve hiçbir yeni davranışa bağlanmıyor — sadece ileride
-- (ör. Taktikalp46 için salt-okur bir mağaza kullanıcısı, ya da
-- MB Digital Boost'un kendi ekibiyle bir müşterinin admin'i arasında bir
-- ayrım gerektiğinde) enum'da hazır bulunuyorlar. Kullanılmadıkları
-- sürece sıfır ek davranış/risk taşırlar.
--
-- DÜRÜSTLÜK NOTU — GERİ ALINABİLİRLİK: PostgreSQL bir enum tipinden DEĞER
-- SİLMEYİ desteklemez (tipi yeniden yaratmadan). 'admin'/'customer'
-- etiketleri enum'da SONSUZA DEK kalacak — ama migration'dan sonra hiçbir
-- satır, hiçbir fonksiyon, hiçbir kod yolu onlara referans vermeyecek
-- (bkz. lib/auth/roles.ts — sadece geriye dönük uyumluluk için hâlâ
-- tanınıyorlar). Migration'ın geri kalanı TAM GERİ ALINABİLİR: aşağıdaki
-- UPDATE'in tersini çalıştırıp (platform_admin → admin, store_admin →
-- customer) ve CHECK constraint'i / is_platform_admin() /
-- is_customer_member() fonksiyonlarını 0004'teki haline döndürerek eski
-- davranışa dönülebilir.
--
-- PostgreSQL 12+ üzerinde ALTER TYPE ... ADD VALUE aynı transaction
-- içinde daha sonraki bir komutta kullanılabilir (sadece AYNI komutta
-- kullanılamaz) — Supabase PostgreSQL 15+ çalıştırdığı için bu migration
-- tek bir transaction içinde güvenle tamamlanır.
-- =============================================================================

alter type public.app_role add value if not exists 'super_admin';
alter type public.app_role add value if not exists 'platform_admin';
alter type public.app_role add value if not exists 'store_admin';
alter type public.app_role add value if not exists 'store_editor';
alter type public.app_role add value if not exists 'store_viewer';

-- Veri taşıma: sadece bugün gerçekten var olan iki rol güncelleniyor,
-- başka hiçbir satır etkilenmiyor.
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
-- sayılıyor (ör. Platform DB'deki customers/websites satırlarını
-- GÖREBİLİRLER). "store_viewer YAZAMAZ" kuralı RLS'te değil, uygulama
-- katmanında (requireCustomerWriteAccess, bkz.
-- lib/auth/require-customer-access.ts) uygulanıyor — çünkü asıl site
-- içeriği (hero/solutions/leads/...) tamamen ayrı bir müşteri Supabase
-- projesinde yaşıyor ve platform RLS'in hiç görmediği bir yerde. Bu,
-- Phase 1 raporunda AÇIKÇA belirtilmesi gereken bir mimari sınır.
