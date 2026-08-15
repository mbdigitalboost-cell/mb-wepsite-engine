-- =============================================================================
-- PLATFORM MIGRATION 0002
-- customer_users
--
-- Links an auth user (profiles) to a customer with a role. This single
-- table encodes BOTH of the two roles the system needs:
--
--   role = 'admin'    → an MB Digital Boost admin. customer_id is NULL:
--                        an admin is not scoped to one customer, they see
--                        everything. (Enforced by the check constraint
--                        below, not just convention.)
--   role = 'customer' → a customer user. customer_id is REQUIRED: they
--                        see only that one customer's data.
--
-- No separate "platform_admins" table is needed — this keeps the tenancy
-- model in one place, which is easier to reason about for someone who
-- isn't reading the code day to day.
-- =============================================================================

create type public.app_role as enum ('admin', 'customer');

create table public.customer_users (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An 'admin' row must NOT be tied to a single customer (they see all);
  -- a 'customer' row MUST be tied to exactly one customer. This is what
  -- makes "admin sees everything, customer sees only their own" a
  -- database-level fact, not just something the application code
  -- happens to respect.
  constraint customer_users_role_scope_check check (
    (role = 'admin' and customer_id is null)
    or (role = 'customer' and customer_id is not null)
  )
);

comment on table public.customer_users is
  'Links a profile (auth user) to a role. role=admin rows have customer_id NULL (global access); role=customer rows have customer_id set (scoped access to that one customer only).';

-- A user can only have ONE global admin row.
create unique index customer_users_one_admin_row_per_user
  on public.customer_users (user_id)
  where role = 'admin';

-- A user can only have ONE role-row per customer (no duplicate
-- memberships for the same customer).
create unique index customer_users_one_row_per_customer_per_user
  on public.customer_users (customer_id, user_id)
  where role = 'customer';

create trigger set_customer_users_updated_at
  before update on public.customer_users
  for each row execute function public.set_updated_at();

create index customer_users_user_id_idx on public.customer_users (user_id);
create index customer_users_customer_id_idx on public.customer_users (customer_id);
