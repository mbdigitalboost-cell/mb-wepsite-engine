-- =============================================================================
-- PLATFORM MIGRATION 0012
-- FAZ 5A Security Hardening — anon EXECUTE'un PUBLIC üzerinden de kapatılması
-- + search_path hardening
--
-- ÖNEMLİ: Sadece "REVOKE ... FROM anon" YETERSİZ çünkü bu 3 fonksiyonda PUBLIC'e
-- de ayrıca EXECUTE verilmiş (ACL: "=X/postgres"). anon, PUBLIC'in bir üyesi
-- olduğu için önce PUBLIC'ten revoke edilip sonra authenticated/service_role'e
-- açıkça geri verilmesi gerekiyor.
--
-- Kapsam DIŞI (BİLİNÇLİ, ayrı FAZ'da ele alınacak):
--   - store_public_settings (view) — RLS policy değişikliği gerektiriyor
--   - is_platform_admin() / is_customer_member(uuid) — {public} rollü RLS
--     policy'lerine gömülü, tenant-isolation davranışına dokunuyor — FAZ 5B'ye bırakıldı
--   - Auth "leaked password protection" — Dashboard'dan manuel açılacak
-- =============================================================================

-- is_store_member(uuid)
revoke execute on function public.is_store_member(uuid) from public;
grant execute on function public.is_store_member(uuid) to authenticated;
grant execute on function public.is_store_member(uuid) to service_role;

-- is_store_admin_member(uuid)
revoke execute on function public.is_store_admin_member(uuid) from public;
grant execute on function public.is_store_admin_member(uuid) to authenticated;
grant execute on function public.is_store_admin_member(uuid) to service_role;

-- is_store_editor_member(uuid)
revoke execute on function public.is_store_editor_member(uuid) from public;
grant execute on function public.is_store_editor_member(uuid) to authenticated;
grant execute on function public.is_store_editor_member(uuid) to service_role;

-- set_updated_at() — search_path hardening (EXECUTE yetkisine dokunulmuyor)
alter function public.set_updated_at() set search_path = '';
