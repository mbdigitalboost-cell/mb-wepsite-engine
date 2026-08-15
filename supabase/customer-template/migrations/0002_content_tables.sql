-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0002
-- hero_sections, services, solutions, projects, campaigns, testimonials, faqs
--
-- All content tables here share the same status/timestamp shape as
-- 0001_site_settings_pages.sql. See that file's header for the general
-- rules (generic template, no hardcoded customer values, RLS gates
-- 'published' visibility — see 0005_customer_rls.sql).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- hero_sections
-- -----------------------------------------------------------------------------

create table public.hero_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages (id) on delete set null,
  heading text not null,
  subtext text,
  cta_primary_label text,
  cta_primary_href text,
  cta_secondary_label text,
  cta_secondary_href text,
  background_image text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.hero_sections is
  'Hero content, optionally scoped to one page (page_id NULL = site-wide/home hero).';

create trigger set_hero_sections_updated_at
  before update on public.hero_sections
  for each row execute function public.set_updated_at();

create index hero_sections_page_id_idx on public.hero_sections (page_id);
create index hero_sections_status_idx on public.hero_sections (status);

-- -----------------------------------------------------------------------------
-- Shared shape for services / solutions / projects / campaigns:
--   id, title, slug, description, image, sort_order, status, timestamps
-- Kept as 4 separate tables (not one polymorphic table) on purpose — they
-- are different content types with different future fields, and a shared
-- "kind" column would make RLS/adapters harder to reason about for no
-- real benefit at this scale.
-- -----------------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  image text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_slug_unique unique (slug)
);

create trigger set_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create index services_status_idx on public.services (status);
create index services_sort_order_idx on public.services (sort_order);

create table public.solutions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  image text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solutions_slug_unique unique (slug)
);

create trigger set_solutions_updated_at
  before update on public.solutions
  for each row execute function public.set_updated_at();

create index solutions_status_idx on public.solutions (status);
create index solutions_sort_order_idx on public.solutions (sort_order);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  image text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_slug_unique unique (slug)
);

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index projects_status_idx on public.projects (status);
create index projects_sort_order_idx on public.projects (sort_order);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  image text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_slug_unique unique (slug)
);

create trigger set_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create index campaigns_status_idx on public.campaigns (status);
create index campaigns_sort_order_idx on public.campaigns (sort_order);

-- -----------------------------------------------------------------------------
-- testimonials
-- -----------------------------------------------------------------------------

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  company text,
  quote text not null,
  image text,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

create index testimonials_status_idx on public.testimonials (status);
create index testimonials_sort_order_idx on public.testimonials (sort_order);

-- -----------------------------------------------------------------------------
-- faqs
-- -----------------------------------------------------------------------------

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_faqs_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

create index faqs_status_idx on public.faqs (status);
create index faqs_sort_order_idx on public.faqs (sort_order);
