-- =============================================================================
-- PLATFORM MIGRATION 0001
-- profiles, customers, websites
--
-- This is the PLATFORM Supabase project's schema (the single, central
-- MB Digital Boost database). It does NOT hold any customer's actual
-- website content (hero text, solutions, projects, ...) — that lives in
-- each customer's own, separate Supabase project. This project only
-- tracks: who can log in, which customers/websites exist, and who is
-- allowed to see which customer's data.
-- =============================================================================

-- gen_random_uuid() lives in pgcrypto on most Postgres versions Supabase
-- provisions with; safe to run even if it's already enabled.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Whether a customer (an MB Digital Boost client) is currently active.
-- Deactivating a customer is how we cut off all access to their data
-- without deleting anything.
create type public.customer_status as enum ('active', 'inactive');

-- Whether a specific website (a customer can in principle have more than
-- one) is active. Kept separate from customer_status so a customer with
-- multiple sites can have one paused without affecting the others.
create type public.website_status as enum ('active', 'inactive');

-- -----------------------------------------------------------------------------
-- Shared helper: keeps `updated_at` correct without relying on application
-- code to remember to set it on every update.
-- -----------------------------------------------------------------------------

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
  'Trigger function: sets updated_at = now() on any UPDATE. Attached to every platform table that has an updated_at column.';

-- -----------------------------------------------------------------------------
-- profiles
--
-- One row per Supabase Auth user (admin or customer). `id` is the same
-- UUID as auth.users.id — this table only adds the display fields Auth
-- itself doesn't store. Populated automatically by a trigger on
-- auth.users (see migration 0004), not by application code.
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per Supabase Auth user (both MB Digital Boost admins and customer users). Auto-created by a trigger when a new auth.users row is inserted — see 0004_platform_rls.sql.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- customers
--
-- One row per MB Digital Boost client (e.g. "Petra Mühendislik"). This is
-- the top of the tenancy tree — everything else (websites, users, leads)
-- hangs off a customer.
-- -----------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status public.customer_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_slug_unique unique (slug),
  constraint customers_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.customers is
  'MB Digital Boost clients (tenants). Example: name = "Petra Mühendislik", slug = "petra-muhendislik".';

create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index customers_status_idx on public.customers (status);

-- -----------------------------------------------------------------------------
-- websites
--
-- One row per website a customer owns. Deliberately does NOT store any
-- real Supabase URL or key for that customer's own project — only a
-- `supabase_connection_key` identifier (e.g. "PETRA"). The real
-- credentials live only in Vercel environment variables
-- (SUPABASE_URL_PETRA / SUPABASE_SERVICE_ROLE_KEY_PETRA), read server-side
-- by the connection factory built in a later phase. This is intentional:
-- a leaked/misconfigured row in this table can never expose a secret.
-- -----------------------------------------------------------------------------

create table public.websites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  slug text not null,
  domain text,
  status public.website_status not null default 'active',
  template text,
  supabase_connection_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint websites_slug_unique unique (slug),
  constraint websites_domain_unique unique (domain),
  constraint websites_connection_key_unique unique (supabase_connection_key),
  constraint websites_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Connection keys are used to build env var names
  -- (SUPABASE_URL_<KEY>), so keep them predictable: uppercase letters,
  -- digits and underscores only.
  constraint websites_connection_key_format check (supabase_connection_key ~ '^[A-Z0-9_]+$')
);

comment on table public.websites is
  'One row per customer website. supabase_connection_key (e.g. "PETRA") identifies which customer-specific Supabase project holds this website''s actual content — never store the real URL/key here, see lib/cms/connection.ts once built.';

create trigger set_websites_updated_at
  before update on public.websites
  for each row execute function public.set_updated_at();

create index websites_customer_id_idx on public.websites (customer_id);
create index websites_status_idx on public.websites (status);
-- domain already has a unique index from the constraint above, which
-- Postgres uses for equality lookups (the domain resolver's main query).
