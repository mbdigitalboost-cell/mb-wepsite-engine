-- =============================================================================
-- PLATFORM MIGRATION 0033
-- store_customer_addresses — FAZ 6.2 (çoklu kayıtlı adres), migration
-- 0031/0032's (store_customers) doğrudan devamı.
--
-- Verified via list_migrations before writing this file: 0032 is the latest
-- applied migration, 0033 is unused. Re-verified again immediately before
-- apply_migration itself runs, AND once more after applying (this phase's
-- own explicit instruction) — same discipline as every migration since 0024.
--
-- MİMARİ KARAR — user_id references profiles(id) DIRECTLY (same as
-- store_customers.user_id itself, migration 0031's own comment on why:
-- profiles.id is always in lockstep with auth.users.id via the
-- handle_new_user trigger), rather than only going through
-- store_customer_id. Two reasons: (1) RLS reads it directly — every policy
-- here is `(select auth.uid()) = user_id`, a one-column check, no join
-- needed against store_customers just to authorize a row; (2) it means an
-- address row's ownership is self-evident from the row itself, matching
-- store_customers' own "ownership is a direct column, not something you
-- have to walk a FK to confirm" shape.
--
-- store_id is ALSO a direct column (not derived via store_customer_id),
-- matching store_customers' own denormalized-for-scoping shape exactly —
-- deliberately NOT a composite FK against store_customers(id, store_id)
-- (which would need a new unique(id, store_id) added to store_customers
-- first): store_customers itself doesn't enforce that kind of composite
-- integrity against `stores` either, so this table stays consistent with
-- the simplicity of the table it extends rather than adopting the heavier
-- orders-table composite-FK pattern from migration 0029. Every write path
-- (app/store/[storeSlug]/hesap/adreslerim/actions.ts) always sets store_id
-- from the same resolved store the store_customer_id came from in the same
-- request, so the two never actually diverge in practice.
--
-- AT MOST ONE DEFAULT ADDRESS PER CUSTOMER: a partial unique index on
-- (store_customer_id) WHERE is_default — Postgres partial unique indexes
-- only consider rows matching the predicate, so any number of
-- is_default = false rows coexist freely, but a second is_default = true
-- row for the same store_customer_id is rejected outright at the DB
-- level, not just by application discipline. Application code
-- (setDefaultAddressAction) always UNSETS the previous default in a
-- separate prior statement before SETting the new one, specifically so
-- the two statements never both hold true at once and hit this index.
--
-- RLS — self select/insert/update/DELETE (unlike store_customers itself,
-- which has no delete policy at all): an address is genuinely disposable
-- customer data, not an audit-relevant record like an order, so allowing
-- delete here is a deliberate, narrower-scope decision than the rest of
-- this schema's general "no delete" posture — matches this phase's own
-- explicit "Sil" action requirement.
-- =============================================================================

create table public.store_customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  store_customer_id uuid not null references public.store_customers (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  label text,
  recipient_name text,
  phone text,
  address_city text not null,
  address_district text not null,
  address_neighborhood text,
  address_line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_customer_addresses is
  'FAZ 6.2 — a signed-in storefront customer''s saved delivery addresses, scoped per store (store_id) like store_customers itself. label/recipient_name/phone are all nullable (recipient can differ from the account holder — see column comment); address_neighborhood is nullable at the DB level for consistency with orders/store_customers'' own "DB nullable, lib/validation/store-customer.ts enforces required" pattern, not because it''s meant to be genuinely optional in practice (Turkish delivery addresses need a mahalle).';

comment on column public.store_customer_addresses.recipient_name is
  'Nullable — the person receiving a delivery at this address can differ from the account holder (e.g. a gift, an office address). NULL means the checkout form falls back to the account''s own name, not that anything is broken.';

comment on column public.store_customer_addresses.is_default is
  'At most one true per store_customer_id, enforced by store_customer_addresses_one_default_idx below (a partial unique index), not just application discipline.';

create index store_customer_addresses_store_customer_id_idx on public.store_customer_addresses (store_customer_id);
create index store_customer_addresses_user_id_idx on public.store_customer_addresses (user_id);

create unique index store_customer_addresses_one_default_idx
  on public.store_customer_addresses (store_customer_id)
  where is_default;

create trigger set_store_customer_addresses_updated_at
  before update on public.store_customer_addresses
  for each row execute function public.set_updated_at();

alter table public.store_customer_addresses enable row level security;

create policy store_customer_addresses_self_select
  on public.store_customer_addresses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy store_customer_addresses_self_insert
  on public.store_customer_addresses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy store_customer_addresses_self_update
  on public.store_customer_addresses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy store_customer_addresses_self_delete
  on public.store_customer_addresses for delete
  to authenticated
  using ((select auth.uid()) = user_id);
