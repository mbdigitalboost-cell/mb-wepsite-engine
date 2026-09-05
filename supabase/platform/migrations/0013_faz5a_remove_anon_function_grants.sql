-- =============================================================================
-- PLATFORM MIGRATION 0013
-- FAZ 5A tamamlayıcı düzeltme — 0012'nin kapatamadığı, anon'a ait DOĞRUDAN
-- (PUBLIC'ten bağımsız) EXECUTE grant'larının kaldırılması.
--
-- 0012 sadece "REVOKE ... FROM PUBLIC" yaptı; ama bu 3 fonksiyonda anon'a ayrıca
-- bağımsız bir grant da varmış (anon=X/postgres), bu yüzden anon hâlâ EXECUTE
-- edebiliyordu. Bu migration o kalan grant'ı kaldırıyor.
--
-- Kapsam DIŞI (BİLİNÇLİ, dokunulmuyor): is_platform_admin, is_customer_member,
-- is_store_publicly_visible, store_public_settings, herhangi bir RLS policy.
-- =============================================================================

revoke execute on function public.is_store_member(uuid) from anon;
revoke execute on function public.is_store_admin_member(uuid) from anon;
revoke execute on function public.is_store_editor_member(uuid) from anon;
