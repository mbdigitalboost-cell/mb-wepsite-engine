-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0011
-- brands
--
-- Homepage "Markalar" section (components/sections/brands-section.tsx) —
-- previously a hardcoded TypeScript array (lib/data/petra/brands.ts), now
-- an independently editable content type. Deliberately follows the exact
-- same shape/rules as 0008_product_showcase_items.sql (a near-identical
-- "brand card" content type already proven in production): no per-row
-- tenant scoping (this whole database already belongs to ONE customer),
-- RLS gates 'published' visibility (see 0005_customer_rls.sql's pattern).
--
-- Column naming: `name` (not `brand`) — matches `PetraBrand.name`
-- (lib/data/petra/brands.ts), the static type's own field name (no
-- schema-gap comment needed here, unlike 0008's `brand`/`title` gap).
-- No `category` column — `PetraBrand` has no category/type-equivalent
-- field, so none is added (minimum-necessary-fields rule).
-- `href` — nullable: `PetraBrand.href` exists in the static type but is
-- currently unused by the public slider (cards are deliberately
-- unclickable, see components/sections/brands-slider.tsx's own comment)
-- — kept for schema parity with the static type and for a future
-- per-brand link, same as `product_showcase_items.href`.
-- `slug` — kept for the same reason 0008 kept it despite having no
-- dedicated detail route: `PetraBrand.slug` already exists in the static
-- type as a stable identifier, and every other generic content type
-- (services/solutions/projects/campaigns/product_showcase_items) uses
-- the same `kind:"slug"` admin field — consistency over inventing a
-- brands-specific exception.
-- No `customer_id` column — this template has none anywhere; tenant
-- isolation is at the database level (one Supabase project per
-- customer), not row level, confirmed by every other table in 0002/0008.
-- =============================================================================

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  short_description text,
  image text,
  href text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_slug_unique unique (slug)
);

comment on table public.brands is
  'Homepage "Markalar" brand logo cards — one independent row per brand shown in the brands slider.';

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create index brands_status_idx on public.brands (status);
create index brands_sort_order_idx on public.brands (sort_order);

-- -----------------------------------------------------------------------------
-- RLS — identical pattern to every other content table (0005_customer_rls.sql
-- / 0008_product_showcase_items.sql): anon/authenticated may SELECT only
-- 'published' rows; no insert/update/delete policy for anon/authenticated
-- anywhere (RLS enabled + zero write policies = full deny); service_role
-- (the admin dashboard's connection, lib/cms/connection.ts's
-- getCustomerSupabaseClient()) bypasses RLS entirely, same trust boundary
-- as every other write in this app.
-- -----------------------------------------------------------------------------

alter table public.brands enable row level security;

create policy brands_public_select on public.brands
  for select to anon, authenticated
  using (status = 'published');

-- -----------------------------------------------------------------------------
-- Seed — the 9 real brands currently hardcoded in lib/data/petra/brands.ts,
-- migrated verbatim (same name/short_description/image/href/sort_order
-- values, same order). No new/invented brand. `status = 'published'` so
-- the public site's appearance is unchanged the moment this migration is
-- applied and the adapter is wired (same "zero visual change on apply"
-- rule as 0008's seed).
-- -----------------------------------------------------------------------------

insert into public.brands (name, slug, short_description, image, href, sort_order, status) values
  ('Mitsubishi Heavy', 'mitsubishi-heavy', 'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Mitsubishi Heavy.', '/images/petra/brands/mitsubishi-heavy.png', '/cozumler', 0, 'published'),
  ('Samsung',          'samsung',          'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Samsung.',          '/images/petra/brands/samsung.png',          '/cozumler', 1, 'published'),
  ('Gree',             'gree',             'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Gree.',             '/images/petra/brands/gree.png',             '/cozumler', 2, 'published'),
  ('EuroForm',         'euroform',         'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: EuroForm.',         '/images/petra/brands/euroform.png',         '/cozumler', 3, 'published'),
  ('Haier',            'haier',            'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Haier.',            '/images/petra/brands/haier.png',            '/cozumler', 4, 'published'),
  ('Midea',            'midea',            'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Midea.',            '/images/petra/brands/midea.png',            '/cozumler', 5, 'published'),
  ('Hisense',          'hisense',          'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Hisense.',          '/images/petra/brands/hisense.png',          '/cozumler', 6, 'published'),
  ('Vestel',           'vestel',           'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Vestel.',           '/images/petra/brands/vestel.png',           '/cozumler', 7, 'published'),
  ('Systemair',        'systemair',        'Petra Mühendislik''in satışını ve kurulumunu gerçekleştirdiği markalardan biri: Systemair.',        '/images/petra/brands/systemair.png',        '/cozumler', 8, 'published');
