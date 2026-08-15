-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0003
-- seo_settings, tracking_settings (+ tracking_public_settings view),
-- media_assets, navigation_items
-- =============================================================================

-- -----------------------------------------------------------------------------
-- seo_settings
--
-- No `status` column — unlike the content tables in 0002, SEO metadata
-- isn't a draft/published editorial artifact, it's config attached to a
-- page (or site-wide when page_id is NULL). Public-readable by design
-- (meta tags have to be public to work); see 0005_customer_rls.sql.
-- -----------------------------------------------------------------------------

create table public.seo_settings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages (id) on delete cascade,
  title text,
  description text,
  canonical text,
  og_image text,
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.seo_settings is
  'SEO metadata, optionally scoped to one page (page_id NULL = site-wide default). No status column — this is config, not editorial content; CMS adapter falls back to lib/seo/structured-data.ts-style static behavior when a page has no row here, never fabricates SEO data.';

create trigger set_seo_settings_updated_at
  before update on public.seo_settings
  for each row execute function public.set_updated_at();

create index seo_settings_page_id_idx on public.seo_settings (page_id);

-- -----------------------------------------------------------------------------
-- tracking_settings
--
-- CRITICAL: meta_capi_token is a real secret (Meta Conversions API access
-- token). This table gets NO anon/authenticated SELECT policy at all in
-- 0005_customer_rls.sql — only service_role (server-side only) can ever
-- read it. The tracking_public_settings view below is the ONLY
-- public-facing surface for this table, and it deliberately excludes
-- meta_capi_token and meta_capi_enabled from its column list.
-- -----------------------------------------------------------------------------

create table public.tracking_settings (
  id uuid primary key default gen_random_uuid(),
  ga4_id text,
  gtm_id text,
  meta_pixel_id text,
  meta_capi_enabled boolean not null default false,
  meta_capi_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tracking_settings is
  'Tracking IDs + the Meta CAPI secret token. Never expose meta_capi_token to anon/authenticated — see tracking_public_settings view and 0005_customer_rls.sql.';

create trigger set_tracking_settings_updated_at
  before update on public.tracking_settings
  for each row execute function public.set_updated_at();

-- Safe public projection: only the 3 client-safe IDs, never the token.
-- A view's default execution mode (security_invoker = false, i.e. runs as
-- the view owner) is what lets this expose data to anon/authenticated
-- despite tracking_settings itself having no SELECT policy for them —
-- verified empirically against real Postgres RLS, see supabase/customer-template/README.md.
create view public.tracking_public_settings
  with (security_invoker = false)
  as
  select ga4_id, gtm_id, meta_pixel_id
  from public.tracking_settings
  limit 1;

comment on view public.tracking_public_settings is
  'Public-safe projection of tracking_settings — ga4_id/gtm_id/meta_pixel_id only, NEVER meta_capi_token. This is the only way anon/authenticated can read anything from tracking_settings.';

-- -----------------------------------------------------------------------------
-- media_assets
--
-- No `status` column (not an editorial draft/published artifact — an
-- uploaded asset either exists or it doesn't). Publicly readable by
-- design: these rows only ever describe already-public storage URLs, see
-- 0005_customer_rls.sql. Storage bucket folder convention (documented,
-- not enforced by this migration — see README):
--   brand/ hero/ solutions/ services/ projects/ campaigns/ banners/
-- matching the naming already used in the Petra Asset Manifest / Final
-- Asset Implementation Brief.
-- -----------------------------------------------------------------------------

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_url text not null,
  storage_path text not null,
  alt_text text,
  type text,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.media_assets is
  'Uploaded media metadata. storage_path follows the documented folder convention (brand/, hero/, solutions/, services/, projects/, campaigns/, banners/) — see supabase/customer-template/README.md. This migration only creates the table; no upload system exists yet (Phase 5 explicitly excludes it).';

create trigger set_media_assets_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

create index media_assets_storage_path_idx on public.media_assets (storage_path);

-- -----------------------------------------------------------------------------
-- navigation_items
-- -----------------------------------------------------------------------------

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.navigation_items is
  'Public nav links — the CMS equivalent of lib/data/petra/navigation.ts. status-gated like the 0002 content tables.';

create trigger set_navigation_items_updated_at
  before update on public.navigation_items
  for each row execute function public.set_updated_at();

create index navigation_items_status_idx on public.navigation_items (status);
create index navigation_items_sort_order_idx on public.navigation_items (sort_order);
