-- =============================================================================
-- PLATFORM MIGRATION 0030
-- orders.payment_method + orders.address_neighborhood — FAZ 2.6 (checkout
-- wizard: il/ilçe/mahalle + payment method selection)
--
-- migration 0029 is NOT touched here (already applied, already has real
-- order rows in production — verified via list_migrations right before
-- this migration was written) — this is a separate, additive migration.
--
-- BOTH COLUMNS NULLABLE, DELIBERATELY NOT "not null": `orders` already
-- has real rows (at least 2 confirmed live orders as of this migration)
-- created before these columns existed, so a `not null` constraint here
-- would fail outright against that existing data — and even a `not null
-- default X` would backfill every historical order with a fabricated
-- value that was never actually true for it. Real enforcement instead
-- lives at the application layer: createOrderAction's checkoutFormSchema
-- (lib/validation/order.ts) already requires both addressNeighborhood
-- and paymentMethod via zod, so every NEW order will always have them —
-- a NULL on either column, going forward, only ever means "an order
-- placed before this migration", which the admin UI (orders/[orderId]/
-- page.tsx) renders as "-" rather than treating as an error.
-- =============================================================================

alter table public.orders add column payment_method text;
alter table public.orders add column address_neighborhood text;

comment on column public.orders.payment_method is
  'FAZ 2.6 — one of "Kapıda Nakit" / "Kapıda Kart" / "Havale-EFT" (lib/validation/order.ts''s own paymentMethodSchema enum), informational only — no real payment gateway this phase (Faz 3''s job, not started without first asking which provider(s), same reasoning as the carrier-integration deferral in migration 0029). Nullable: orders created before this migration have no value here.';

comment on column public.orders.address_neighborhood is
  'FAZ 2.6 — free-text mahalle, required by checkoutFormSchema for every NEW order (see that schema''s own comment on why this is free text rather than a third cascading dropdown level: the source neighborhood dataset is ~16.7MB across 73,496 rows, impractical to bundle). Nullable at the DB layer only because orders created before this migration have no value here.';

-- No RLS change needed — orders_update_editor_tier (migration 0029) already
-- covers every column on this table, including these two.
