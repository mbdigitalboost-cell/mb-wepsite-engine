-- =============================================================================
-- PLATFORM MIGRATION 0029
-- orders + order_items + order_item_addons — FAZ 2 (mağaza sepeti/sipariş),
-- "sipariş talebi" (ödeme YOK)
--
-- FILE-NAME NUMBER IS ADVISORY ONLY: this repo's own history (0024 applied
-- to production AFTER 0025-0028, confirmed via list_migrations) shows the
-- filename's leading number does not guarantee application order. This
-- file's number is chosen as "next unused locally", not verified against
-- production's real applied sequence until apply_migration itself runs
-- (see the FAZ 2 task report for that live check).
--
-- MİMARİ KARAR — anon INSERT RLS YOK: these 3 tables get NO policy for
-- `anon` at all (default deny), on ANY operation. The public storefront
-- checkout (app/store/[storeSlug]/sepet/actions.ts) writes through
-- createSupabaseAdminClient() (service-role, same pattern already used by
-- lib/auth/audit-log.ts and lib/commerce/public/products.ts's own image
-- signing) instead. This is deliberate, not a placeholder to fill in
-- later: it's what makes the client-can-never-set-a-price guarantee real
-- at the DB layer, not just in application code — a compromised/tampered
-- client has literally no RLS path to write these tables directly.
--
-- `store_editor+` (is_store_editor_member, existing helper from migration
-- 0008) gets SELECT on all 3 tables and UPDATE on `orders` only (status
-- transitions) — deliberately NOT is_store_member/store_viewer: an order
-- carries customer PII (phone/address/email), a tighter default than the
-- viewer-readable products/categories/brands tables.
--
-- NO PERMANENT DELETE — audit trail: no DELETE policy for any role on any
-- of these 3 tables (not even store_admin+), unlike every other commerce
-- table in this schema (products/variants/addons all reserve DELETE for
-- store_admin+). An order, once created, is never removed.
--
-- product_id/variant_id/addon_id are all NULLABLE with ON DELETE SET NULL
-- (not CASCADE, not NOT NULL) — mirrors product_images.variant_id's own
-- precedent (migration 0019): a product/variant/addon can still be
-- deleted later by an admin without destroying historical order data,
-- because product_name/variant_label/unit_price/addon_name/price_delta
-- are all SNAPSHOTTED onto the order row at creation time, never re-read
-- live from the catalog after the fact.
-- =============================================================================

create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'completed',
  'cancelled'
);

comment on type public.order_status is
  'FAZ 2 order lifecycle. No payment states (no payment integration this phase) — "confirmed" means an admin has reviewed/called the customer, not that money changed hands.';

-- FAZ 2.5 — added before this migration was ever applied (Supabase MCP was
-- down for STEP 2's original apply attempt), so payment_status/paid_at/
-- carrier/tracking_number/shipped_at are folded directly into the CREATE
-- TABLE below rather than appended as separate ALTER TABLE statements —
-- the table doesn't exist in production yet, so there's nothing to alter,
-- just one more column list to get right the first time. Still one
-- migration total, as asked.
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');

comment on type public.payment_status is
  'FAZ 2.5 — separate from order_status on purpose: an order can be "preparing" and "paid" at the same time, or "completed" and still "unpaid" (cash-on-delivery) — these are two independent axes, not one combined status enum.';

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_number bigserial not null,
  status public.order_status not null default 'pending',
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address_city text not null,
  address_district text not null,
  address_line text not null,
  note text,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  payment_status public.payment_status not null default 'unpaid',
  paid_at timestamptz,
  -- Kargo entegrasyonu ŞİMDİ yapılmıyor (ayrı bir faz, hangi kargo
  -- firması sorulacak) — hepsi nullable, bugün SADECE admin elle
  -- doldurabilir (updateShippingInfoAction, store_editor+), şema ileride
  -- bir entegrasyon geldiğinde bozulmadan genişlesin diye şimdiden açık.
  carrier text,
  tracking_number text,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_id_store_id_unique unique (id, store_id),
  constraint orders_order_number_unique unique (order_number)
);

comment on table public.orders is
  'FAZ 2 — a storefront order request (no payment integration, only a payment_status field an admin sets by hand). Written EXCLUSIVELY via createSupabaseAdminClient() from app/store/[storeSlug]/sepet/actions.ts''s createOrderAction — no anon RLS policy exists on this table at all. order_number is a plain global bigserial (not per-store) for FAZ 2 simplicity. subtotal is the server-recomputed total (sum of order_items.line_total) at creation time, never trusted from the client. No DELETE policy for any role — orders are a permanent audit trail. No separate policy needed for the FAZ 2.5 columns below — orders_update_editor_tier already covers every column on this table.';

comment on column public.orders.customer_email is
  'Nullable/optional per spec (customerName/customerPhone are the only required contact fields) — a phone-only customer can still place an order.';

comment on column public.orders.paid_at is
  'Set by updateOrderPaymentStatusAction the moment payment_status is first changed to ''paid'' (never overwritten on a later update) — same "set once, on the real transition" pattern as shipped_at below.';

comment on column public.orders.carrier is
  'FAZ 2.5 — free-text carrier name (no fixed carrier list/integration this phase). Admin-entered only.';

comment on column public.orders.tracking_number is
  'FAZ 2.5 — free-text tracking number, no format validation (varies per carrier). Admin-entered only.';

comment on column public.orders.shipped_at is
  'Set by updateShippingInfoAction the moment carrier/tracking_number are first saved with status already at (or moving to) ''shipped'' (never overwritten on a later edit) — see that action''s own comment.';

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index orders_store_id_idx on public.orders (store_id);
create index orders_store_id_status_idx on public.orders (store_id, status);
create index orders_store_id_created_at_idx on public.orders (store_id, created_at desc);

alter table public.orders enable row level security;

create policy orders_select_editor_tier
  on public.orders for select
  to authenticated
  using ((select public.is_store_editor_member(store_id)));

-- Status transitions only, in practice (updateOrderStatusAction only ever
-- sets `status`) — RLS itself doesn't restrict to that one column (no
-- column-level RLS in Postgres without a trigger), the same "RLS is the
-- broad tenant/tier gate, the application query is the surgical layer"
-- split already used everywhere else in this schema (e.g.
-- toggleProductActiveAction's own `.update({ is_active })`).
create policy orders_update_editor_tier
  on public.orders for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

-- Deliberately NO insert policy for `authenticated` either — even a
-- store_editor cannot INSERT a row here through the anon/authenticated
-- client; every order is created via the service-role admin client only
-- (see this migration's own header). NO delete/anon-select policy at all.

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null,
  product_id uuid,
  variant_id uuid,
  product_name text not null,
  variant_label text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_id_store_id_unique unique (id, store_id),
  constraint order_items_order_id_store_id_fkey
    foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade,
  constraint order_items_product_id_store_id_fkey
    foreign key (product_id, store_id) references public.products (id, store_id) on delete set null,
  constraint order_items_variant_id_store_id_fkey
    foreign key (variant_id, store_id) references public.product_variants (id, store_id) on delete set null
);

comment on table public.order_items is
  'FAZ 2 — one line of an order. product_name/variant_label/unit_price/line_total are SNAPSHOTS taken at order-creation time via lib/commerce/pricing.ts''s computeConfiguredPrice (server-recomputed from fresh DB rows, never trusted from the client) — never re-read live from products/product_variants after the fact, so a later price change or even a product/variant DELETE (ON DELETE SET NULL, not CASCADE) never alters or destroys this historical record. order_id CASCADEs (deleting the parent order — which never happens in practice, see orders'' own "no delete" comment — takes its own lines with it, standard child-of-a-parent-that-is-never-deleted hygiene).';

create index order_items_store_id_idx on public.order_items (store_id);
create index order_items_order_id_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

create policy order_items_select_editor_tier
  on public.order_items for select
  to authenticated
  using ((select public.is_store_editor_member(store_id)));

-- No insert/update/delete policy for any role — written only via the
-- service-role admin client (same as `orders`), never modified after
-- creation (no update path exists in the application at all).

-- -----------------------------------------------------------------------------
-- order_item_addons
-- -----------------------------------------------------------------------------

create table public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_item_id uuid not null,
  addon_id uuid,
  addon_name text not null,
  price_delta numeric(12, 2) not null check (price_delta >= 0),
  created_at timestamptz not null default now(),
  constraint order_item_addons_order_item_id_store_id_fkey
    foreign key (order_item_id, store_id) references public.order_items (id, store_id) on delete cascade,
  constraint order_item_addons_addon_id_store_id_fkey
    foreign key (addon_id, store_id) references public.product_addons (id, store_id) on delete set null
);

comment on table public.order_item_addons is
  'FAZ 2 — the add-ons selected for one order_item, SNAPSHOTTED (addon_name/price_delta) at order-creation time, same reasoning as order_items'' own comment. addon_id deletes SET NULL (a later-deleted add-on never destroys the historical record); order_item_id CASCADEs (a deleted order_item — which only happens via its parent order''s own cascade, never directly — takes its addon rows with it).';

create index order_item_addons_store_id_idx on public.order_item_addons (store_id);
create index order_item_addons_order_item_id_idx on public.order_item_addons (order_item_id);

alter table public.order_item_addons enable row level security;

create policy order_item_addons_select_editor_tier
  on public.order_item_addons for select
  to authenticated
  using ((select public.is_store_editor_member(store_id)));

-- No insert/update/delete policy for any role — same reasoning as
-- order_items above.
