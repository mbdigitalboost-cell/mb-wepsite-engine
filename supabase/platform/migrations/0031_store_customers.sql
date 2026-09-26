-- =============================================================================
-- PLATFORM MIGRATION 0031
-- store_customers + orders.customer_user_id — FAZ 5.1 (e-posta+şifre müşteri
-- hesapları)
--
-- Verified via list_migrations before writing this file: 0030 is the latest
-- applied migration, 0031 is unused. FILE-NAME NUMBER IS ADVISORY ONLY (same
-- caveat as every migration since 0024 in this repo) — re-verified with
-- list_migrations again immediately before apply_migration itself runs.
--
-- MİMARİ KARAR — reuses the EXISTING Supabase Auth user pool (auth.users),
-- no separate storefront auth system. Guest checkout (orders.customer_user_id
-- NULL) remains fully supported and unchanged — this is purely additive.
--
-- FK TARGET DEVIATION FROM THE ORIGINAL SPEC (reported, not silently done):
-- the spec's draft SQL had `user_id uuid references auth.users(id)`. This
-- schema's own established convention — customer_users.user_id (migration
-- 0002) and audit_logs.user_id (migration 0003) — references
-- `public.profiles(id)` instead, never auth.users directly. That's not
-- arbitrary: migration 0004's `handle_new_user()` trigger auto-inserts a
-- public.profiles row for EVERY auth.users insert (any signup, admin invite,
-- OR a new storefront customer signing up here), so profiles.id is always in
-- lockstep with auth.users.id one-to-one, and every other user-referencing FK
-- in this schema already points at profiles for that reason. store_customers
-- and orders.customer_user_id follow the same convention here for
-- consistency — functionally identical (same underlying user), just
-- consistent with the rest of the schema instead of introducing the only FK
-- in this database that points at auth.users directly.
--
-- "MAĞAZAYA ÖZEL" ISOLATION: store_customers is the join between a shared
-- auth identity (profiles.id) and a specific store (store_id) — the same
-- person can have a store_customers row for multiple stores (unique
-- (user_id, store_id), not unique on user_id alone). Orders stay fully
-- isolated per store_id regardless (unchanged from migration 0029) —
-- customer_user_id only ever answers "did THIS signed-in user place THIS
-- order", scoped by the application's own `.eq("store_id", ...)` on every
-- query, same "RLS is the broad gate, the app query is the surgical layer"
-- split as every other table in this schema.
--
-- RLS: self select/insert/update only (a customer manages only their own
-- store_customers row) — the INSERT policy is NOT in the original spec's
-- draft SQL either; without it, actions.ts's own upsert (run under the
-- user's own authenticated session, never the service-role client — see
-- app/store/[storeSlug]/hesap/actions.ts) would be rejected by RLS with no
-- matching policy. No DELETE policy — account deletion is out of scope this
-- phase, matches this schema's general "no delete without an explicit,
-- separate decision" posture.
--
-- orders.customer_user_id is nullable + ON DELETE SET NULL (never CASCADE):
-- deleting a profiles row (which never happens in practice — Supabase Auth
-- users aren't deleted by this application) must not destroy historical
-- order rows, same reasoning as order_items.product_id/variant_id in
-- migration 0029. The new `orders_select_own_customer` policy is ADDED
-- alongside migration 0029's existing `orders_select_editor_tier` (RLS
-- policies for the same command OR together) — that policy is NOT modified,
-- per the explicit instruction not to touch 0029.
-- =============================================================================

create table public.store_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  constraint store_customers_user_id_store_id_unique unique (user_id, store_id)
);

comment on table public.store_customers is
  'FAZ 5.1 — links a shared Supabase Auth identity (profiles.id) to a specific store''s customer base. A user can have a row here for more than one store (same email, separate registration per store) — see this migration''s own header. phone is nullable: no UI in this phase ever fills it (signup is email+password only); reserved for FAZ 5.2 (telefon+SMS, NOT started this phase).';

create index store_customers_store_id_idx on public.store_customers (store_id);

alter table public.store_customers enable row level security;

create policy store_customers_select_self
  on public.store_customers for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Added beyond the original spec's draft SQL — required for
-- ensureStoreCustomerLink()'s own upsert (actions.ts) to succeed at all
-- under RLS; see this migration's own header.
create policy store_customers_insert_self
  on public.store_customers for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy store_customers_update_self
  on public.store_customers for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy for any role — account deletion is out of scope this
-- phase (same "no delete without its own explicit decision" posture as
-- orders/order_items/order_item_addons in migration 0029).

-- -----------------------------------------------------------------------------
-- orders.customer_user_id
-- -----------------------------------------------------------------------------

alter table public.orders
  add column customer_user_id uuid references public.profiles (id) on delete set null;

comment on column public.orders.customer_user_id is
  'FAZ 5.1 — set by createOrderAction when the order was placed by a signed-in storefront customer (read from the request''s own Supabase Auth session, never trusted from client input). NULL for guest checkout, which remains fully supported and unchanged — this column is purely additive, no existing behavior depends on it being set.';

create index orders_customer_user_id_idx on public.orders (customer_user_id);

-- Migration 0029's orders_select_editor_tier and orders_update_editor_tier
-- policies are UNTOUCHED. This policy is ADDED alongside them (same table,
-- same command, OR'd together) so a signed-in customer can also select
-- their own past orders for the account page's order history.
create policy orders_select_own_customer
  on public.orders for select
  to authenticated
  using ((select auth.uid()) = customer_user_id);
