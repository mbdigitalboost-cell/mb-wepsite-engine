-- =============================================================================
-- PLATFORM MIGRATION 0032
-- store_customers profile fields — FAZ 5.1b (kayıtta isim+adres toplama,
-- checkout'u hesap profilinden otomatik doldurma), migration 0031'in
-- doğrudan devamı.
--
-- Verified via list_migrations before writing this file: 0031 is the latest
-- applied migration, 0032 is unused. Re-verified again immediately before
-- apply_migration itself runs (same discipline as every migration since
-- 0024).
--
-- All 5 columns nullable, same principle as migration 0030's
-- payment_method/address_neighborhood: store_customers has no real rows in
-- production yet (Faz 5.1 shipped without ever being exercised by a real
-- signup before this), but the actual "required" enforcement lives in
-- lib/validation/store-customer.ts's storeSignupFormSchema, not a DB-level
-- NOT NULL — a Faz-5.1-era row created via loginAction's own
-- ensureStoreCustomerLink (email-only, no form these fields could have come
-- from) must remain a valid row with these left null, not an inconsistent
-- state a NOT NULL constraint would forbid.
--
-- No RLS policy changes needed — migration 0031's existing
-- store_customers_select_self/_insert_self/_update_self policies already
-- cover every column on this table, these are just 5 more nullable columns
-- on the same row.
-- =============================================================================

alter table public.store_customers
  add column full_name text,
  add column address_city text,
  add column address_district text,
  add column address_neighborhood text,
  add column address_line text;

comment on column public.store_customers.full_name is
  'FAZ 5.1b — collected at signup (kayit/signup-form.tsx), same "Ad Soyad" field checkout also asks for. Nullable: a Faz-5.1-era row (or one created by ensureStoreCustomerLink from a plain login, never a signup) may never have this set.';

comment on column public.store_customers.address_city is
  'FAZ 5.1b — same il/ilçe/mahalle/adres shape as orders.address_city (checkoutFormSchema), collected at signup and used to pre-fill checkout''s own address fields. Optionally kept in sync with the customer''s most recently used shipping address by createOrderAction (see that action''s own comment) — NOT necessarily "the signup address" forever.';
