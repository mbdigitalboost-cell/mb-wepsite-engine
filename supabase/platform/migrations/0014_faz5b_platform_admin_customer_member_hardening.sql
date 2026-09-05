-- =============================================================================
-- PLATFORM MIGRATION 0014
-- FAZ 5B Security Hardening — is_platform_admin()/is_customer_member(uuid)
-- için anon EXECUTE'un kapatılması, FAZ 5A'nın (0012/0013) is_store_member/
-- is_store_admin_member/is_store_editor_member için uyguladığı standardın
-- bu iki fonksiyona da getirilmesi.
--
-- SIRA KRİTİK (bkz. claude/FAZ5B_SECURITY_HARDENING_AUDIT.md §16):
--   A) ÖNCE: is_platform_admin()/is_customer_member(uuid)'i çağıran 18
--      RLS policy'sinin hedef rolünü örtük `public`'ten açık
--      `authenticated`'a çevir (ALTER POLICY ... TO ..., USING/WITH CHECK
--      ifadeleri DEĞİŞMİYOR — sadece hangi rolün policy'yi değerlendireceği
--      değişiyor).
--   B) SONRA: iki fonksiyondan anon EXECUTE'u kaldır.
-- Bu sıra tersine çevrilirse, adım B adım A'dan önce çalıştırılırsa,
-- anon'un bu 6 tabloya (customers/websites/customer_users/audit_logs/
-- profiles/stores) attığı PostgREST istekleri "permission denied for
-- function" hatasıyla kırılır — çünkü policy hâlâ `public` hedefli
-- olduğu için anon isteği hâlâ fonksiyonu çağırmaya ÇALIŞIR, ama artık
-- EXECUTE izni yok. A önce uygulanınca anon için policy hiç
-- değerlendirilmiyor, fonksiyon hiç çağrılmıyor, B güvenle uygulanabiliyor.
--
-- KAPSAM DIŞI (BİLİNÇLİ, dokunulmuyor):
--   - `profiles_update_self` policy'si — roles={public} ama
--     is_platform_admin()/is_customer_member() ÇAĞIRMIYOR (sadece
--     id = auth.uid()) — bu migration'ın hedefi dışında, dokunulmuyor.
--   - is_store_member/is_store_admin_member/is_store_editor_member —
--     FAZ 5A'da zaten kapatıldı (0012/0013), bu migration dokunmuyor.
--   - is_store_publicly_visible(uuid) — anon-çağrılabilir KALMALI
--     (kasıtlı tasarım, storefront public-visibility gate'i), dokunulmuyor.
--   - store_public_settings view'ının SELECT davranışı, SECURITY DEFINER
--     yapısı, view definition'ı — DEĞİŞMİYOR. Sadece view'a verilmiş ama
--     hiçbir zaman kullanılamayan (join'li view, INSTEAD OF trigger yok)
--     INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES grant'ları
--     temizleniyor (C bölümü) — sıfır fonksiyonel etki, saf hijyen.
--   - Hiçbir fonksiyonun kendi mantığı (function body) değişmiyor.
--   - Hiçbir tenant-isolation/RLS USING/WITH CHECK ifadesi değişmiyor.
--
-- Tamamen geri alınabilir: her ALTER POLICY için `to public` ile, her
-- REVOKE için karşılık gelen GRANT ile (bkz. claude/FAZ5B_SECURITY_
-- HARDENING_AUDIT.md §18 Rollback Plan).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) 18 policy — roles: {public} -> {authenticated}
-- -----------------------------------------------------------------------------

-- audit_logs (1)
alter policy audit_logs_select_member_or_admin on public.audit_logs to authenticated;

-- customer_users (4)
alter policy customer_users_delete_admin_only on public.customer_users to authenticated;
alter policy customer_users_insert_admin_only on public.customer_users to authenticated;
alter policy customer_users_select_self_or_admin on public.customer_users to authenticated;
alter policy customer_users_update_admin_only on public.customer_users to authenticated;

-- customers (4)
alter policy customers_delete_admin_only on public.customers to authenticated;
alter policy customers_insert_admin_only on public.customers to authenticated;
alter policy customers_select_member_or_admin on public.customers to authenticated;
alter policy customers_update_admin_only on public.customers to authenticated;

-- profiles (1 — SADECE is_platform_admin() çağıran policy; profiles_update_self HARİÇ)
alter policy profiles_select_self_or_admin on public.profiles to authenticated;

-- stores (4)
alter policy stores_delete_admin_only on public.stores to authenticated;
alter policy stores_insert_admin_only on public.stores to authenticated;
alter policy stores_select_member_or_admin on public.stores to authenticated;
alter policy stores_update_admin_only on public.stores to authenticated;

-- websites (4)
alter policy websites_delete_admin_only on public.websites to authenticated;
alter policy websites_insert_admin_only on public.websites to authenticated;
alter policy websites_select_member_or_admin on public.websites to authenticated;
alter policy websites_update_admin_only on public.websites to authenticated;

-- -----------------------------------------------------------------------------
-- B) anon EXECUTE kaldırma — SADECE A tamamlandıktan SONRA güvenli
-- -----------------------------------------------------------------------------

revoke execute on function public.is_platform_admin() from anon;
revoke execute on function public.is_customer_member(uuid) from anon;

-- -----------------------------------------------------------------------------
-- C) store_public_settings — kullanılmayan yazma-grant'larının temizliği
-- (opsiyonel hijyen, P2 — view zaten join içerdiği için otomatik-updatable
-- değil, bu grant'lar hiçbir zaman fonksiyonel olarak çalışmıyordu).
-- View'ın SELECT'i, SECURITY DEFINER yapısı, definition'ı DOKUNULMUYOR.
-- -----------------------------------------------------------------------------

revoke insert, update, delete, truncate, trigger, references
  on public.store_public_settings
  from anon, authenticated;
