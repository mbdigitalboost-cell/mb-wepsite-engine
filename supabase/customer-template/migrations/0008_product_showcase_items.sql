-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0008
-- product_showcase_items
--
-- Homepage "Ürün Yelpazesi" section (components/sections/product-showcase-
-- section.tsx) — previously a hardcoded TypeScript array
-- (lib/data/petra/product-showcase.ts), now an independently editable
-- content type, same shape/rules as every other content table in this
-- template (see 0002_content_tables.sql's header): no per-row tenant
-- scoping (this whole database already belongs to ONE customer), RLS
-- gates 'published' visibility (see 0005_customer_rls.sql's pattern).
--
-- Column naming deliberately follows the existing template's own
-- conventions rather than the legacy static array's field names:
--   - `brand` (not `title`) — matches the source data's real field name;
--     the generic admin engine's `titleField` config already supports a
--     non-"title" title column (see testimonials.name, faqs.question).
--   - `category` (not `type`) — matches `projects.category`'s existing
--     naming for the same "short classification label" concept.
--   - `image` (not `image_url`) — matches services/solutions/projects/
--     campaigns/testimonials, all of which use `image`.
--   - `href` — added (nullable): every seed row below carries the exact
--     same static value ("/cozumler") the legacy array had, but this
--     column lets an admin give an individual product its own link
--     later, same pattern as `campaigns.cta_href` (migration 0007).
-- No `customer_id` column — this template has none anywhere; tenant
-- isolation is at the database level (one Supabase project per customer),
-- not row level, confirmed by every other table in 0002.
-- =============================================================================

create table public.product_showcase_items (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  slug text not null,
  category text,
  short_description text,
  image text,
  href text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_showcase_items_slug_unique unique (slug)
);

comment on table public.product_showcase_items is
  'Homepage "Ürün Yelpazesi" product cards — one independent row per brand/product shown in the showcase slider.';

create trigger set_product_showcase_items_updated_at
  before update on public.product_showcase_items
  for each row execute function public.set_updated_at();

create index product_showcase_items_status_idx on public.product_showcase_items (status);
create index product_showcase_items_sort_order_idx on public.product_showcase_items (sort_order);

-- -----------------------------------------------------------------------------
-- RLS — identical pattern to every other content table (0005_customer_rls.sql):
-- anon/authenticated may SELECT only 'published' rows; no insert/update/
-- delete policy for anon/authenticated anywhere (RLS enabled + zero
-- write policies = full deny); service_role bypasses RLS entirely.
-- -----------------------------------------------------------------------------

alter table public.product_showcase_items enable row level security;

create policy product_showcase_items_public_select on public.product_showcase_items
  for select to anon, authenticated
  using (status = 'published');

-- -----------------------------------------------------------------------------
-- Seed — the 8 real products currently hardcoded in
-- lib/data/petra/product-showcase.ts, migrated verbatim (same brand/
-- category/short_description/image/sort_order values, same order). No
-- new/invented product. `status = 'published'` so the public site's
-- appearance is unchanged the moment this migration is applied and the
-- adapter is wired (see FAZ 4C-UYGULAMA's app/(public)/page.tsx change).
-- -----------------------------------------------------------------------------

insert into public.product_showcase_items (brand, slug, category, short_description, image, href, sort_order, status) values
  ('EuroForm',   'euroform-klima',          'Klima Çözümü',              'Petra Mühendislik''in sunduğu EuroForm ürünlerinden biri.',   '/images/petra/products/euroform.jpg',   '/cozumler', 0, 'published'),
  ('Samsung',    'samsung-klima',           'Klima Çözümü',              'Petra Mühendislik''in sunduğu Samsung ürünlerinden biri.',    '/images/petra/products/samsung.jpg',    '/cozumler', 1, 'published'),
  ('Gree',       'gree-klima',              'Klima Çözümü',              'Petra Mühendislik''in sunduğu Gree ürünlerinden biri.',       '/images/petra/products/gree.webp',      '/cozumler', 2, 'published'),
  ('Haier',      'haier-klima',             'Klima Çözümü',              'Petra Mühendislik''in sunduğu Haier ürünlerinden biri.',      '/images/petra/products/haier.webp',     '/cozumler', 3, 'published'),
  ('Midea',      'midea-klima',             'Klima Çözümü',              'Petra Mühendislik''in sunduğu Midea ürünlerinden biri.',      '/images/petra/products/midea.webp',     '/cozumler', 4, 'published'),
  ('Hisense',    'hisense-klima',           'Klima Çözümü',              'Petra Mühendislik''in sunduğu Hisense ürünlerinden biri.',    '/images/petra/products/hisense.webp',   '/cozumler', 5, 'published'),
  ('Vestel',     'vestel-klima',            'Dış Ünite',                 'Petra Mühendislik''in sunduğu Vestel ürünlerinden biri.',     '/images/petra/products/vestel.webp',    '/cozumler', 6, 'published'),
  ('Systemair',  'systemair-havalandirma',  'Endüstriyel Havalandırma',  'Petra Mühendislik''in sunduğu Systemair ürünlerinden biri.',  '/images/petra/products/systemair.jpg',  '/cozumler', 7, 'published');
