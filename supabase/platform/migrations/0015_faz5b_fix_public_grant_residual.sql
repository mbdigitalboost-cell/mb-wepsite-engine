-- =============================================================================
-- PLATFORM MIGRATION 0015
-- FAZ 5B tamamlayıcı düzeltme — 0014'ün kapatamadığı, is_platform_admin()/
-- is_customer_member(uuid)'in PUBLIC üzerinden kalan EXECUTE'unun kaldırılması.
--
-- KÖK NEDEN (bkz. claude/FAZ5B_UYGULAMA_VE_DOGRULAMA_RAPORU.md §5, §17):
-- 0014 sadece `revoke execute ... from anon;` yaptı (0013'ün deseni). Ama
-- is_store_member/admin/editor_member'dan farklı olarak, is_platform_admin()/
-- is_customer_member(uuid)'in ACL'inde hâlâ örtük bir PUBLIC girişi
-- (`=X/postgres`) duruyordu — 0012'nin is_store_member için yaptığı
-- `revoke ... from public` adımının eşdeğeri hiçbir zaman bu iki fonksiyona
-- uygulanmamıştı. `anon` Postgres'te her zaman PUBLIC'in üyesi olduğu için,
-- kendi bağımsız grant'ı (0014'te) kalksa bile PUBLIC üzerinden EXECUTE'u
-- miras almaya devam etti — migration sonrası canlı testte (`set local role
-- anon; select is_platform_admin();` → hata YOK, `false`) ve Advisor'ın
-- `anon_security_definer_function_executable` uyarısının kapanmamasıyla
-- bağımsız olarak doğrulandı.
--
-- BU MIGRATION, 0012'nin is_store_member için uyguladığı BAŞARILI deseni
-- (`revoke ... from public` ÖNCE, `grant ... to authenticated, service_role`
-- SONRA) birebir tekrarlıyor. 18 RLS policy zaten 0014'te `to authenticated`
-- yapıldığı için bu adım GÜVENLE uygulanabilir — authenticated kullanıcılar
-- için hiçbir davranış değişmez, sadece PUBLIC/anon'un miras kalan erişimi
-- gerçekten kapanır.
--
-- KAPSAM DIŞI (dokunulmuyor): fonksiyonların kendi mantığı, is_store_member/
-- admin/editor_member, is_store_publicly_visible, store_public_settings,
-- herhangi bir RLS USING/WITH CHECK ifadesi, herhangi bir policy'nin rol
-- hedefi (0014'te zaten tamamlandı).
--
-- Geri alınabilir: `grant execute on function public.is_platform_admin() to
-- public;` ve aynısı is_customer_member için (PUBLIC'e geri vermek anon'u da
-- otomatik olarak kapsar, 0014-öncesi duruma döner).
-- =============================================================================

revoke execute on function public.is_platform_admin() from public;
revoke execute on function public.is_customer_member(uuid) from public;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.is_customer_member(uuid) to authenticated, service_role;
