-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0001
-- site_settings, pages
--
-- This is the CUSTOMER TEMPLATE — applied once per customer, into THAT
-- customer's own, separate Supabase project (never into the Platform
-- project). It holds only that one customer's real website/CMS content.
-- Nothing here is customer-specific: no Petra values are hardcoded
-- anywhere in this template, by design (see Phase 5 instructions).
--
-- Apply this + 0002-0005 in order to a fresh customer Supabase project
-- to provision it. Nothing in this file has been applied to any real
-- project yet — see supabase/customer-template/README.md.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared: content_status + updated_at trigger
--
-- Every content table in this template (site_settings, pages,
-- hero_sections, services, solutions, projects, campaigns, testimonials,
-- faqs, navigation_items) carries this same status. The public/anon
-- audience may only ever see 'published' rows — enforced by RLS in
-- 0005_customer_rls.sql, not by application code alone.
-- -----------------------------------------------------------------------------

create type public.content_status as enum ('draft', 'published', 'archived');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: sets updated_at = now() on any UPDATE. Attached to every customer-template table that has an updated_at column.';

-- -----------------------------------------------------------------------------
-- site_settings
--
-- Generic per-customer site configuration — the CMS equivalent of
-- lib/data/petra/site-config.ts, but for whichever customer this project
-- belongs to. Expected to hold exactly one row in practice, but that is
-- not enforced at the schema level (a customer could reasonably want
-- more than one draft in flight); the CMS adapter always resolves "the"
-- site_settings as the current published row.
-- -----------------------------------------------------------------------------

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  alternate_name text,
  phone text,
  whatsapp text,
  email text,
  address text,
  service_area text,
  working_hours text,
  logo text,
  logo_white text,
  favicon text,
  primary_color text,
  secondary_color text,
  radius text,
  button_style text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is
  'Generic per-customer site configuration (company name, contact info, brand tokens). Template is intentionally generic — no customer-specific values are hardcoded here.';

create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create index site_settings_status_idx on public.site_settings (status);

-- -----------------------------------------------------------------------------
-- pages
--
-- Optional grouping/anchor for hero_sections and seo_settings rows scoped
-- to a specific page (e.g. "hakkimizda", "iletisim") rather than the
-- whole site. hero_sections.page_id / seo_settings.page_id reference this.
-- -----------------------------------------------------------------------------

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_slug_unique unique (slug)
);

comment on table public.pages is
  'One row per public page (e.g. slug="iletisim"). Referenced by hero_sections.page_id and seo_settings.page_id for page-scoped content; both may also be NULL for site-wide defaults.';

create trigger set_pages_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

create index pages_status_idx on public.pages (status);
create index pages_sort_order_idx on public.pages (sort_order);
