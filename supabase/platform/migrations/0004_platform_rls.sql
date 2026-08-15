-- =============================================================================
-- PLATFORM MIGRATION 0004
-- Row Level Security for every platform table
--
-- This is the database-level enforcement of "admin sees everything,
-- customer sees only their own" — it does not depend on the Next.js app
-- getting an `if` check right. Even a direct query against this database
-- with a logged-in user's own session is bound by these rules.
--
-- Two helper functions do the actual "is this user allowed" checks so
-- every policy below stays a one-line call instead of repeating the same
-- subquery everywhere:
--
--   public.is_platform_admin()             → true for MB Digital Boost admins
--   public.is_customer_member(customer_id) → true for that customer's own
--                                             users, AND for admins (an
--                                             admin is always "a member"
--                                             of every customer)
--
-- Both are SECURITY DEFINER: they read customer_users as the function's
-- owner (the role that ran this migration), which — because table
-- ownership bypasses RLS by default in Postgres — lets them check
-- customer_users without recursively re-triggering customer_users' own
-- RLS policies. This is the standard, documented way to avoid infinite
-- recursion when a table's RLS policy needs to query that same table.
-- =============================================================================

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.customer_users
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

comment on function public.is_platform_admin() is
  'True if the currently authenticated user (auth.uid()) has a global admin row in customer_users.';

create or replace function public.is_customer_member(target_customer_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.customer_users
      where user_id = auth.uid()
        and role = 'customer'
        and customer_id = target_customer_id
    );
$$;

comment on function public.is_customer_member(uuid) is
  'True if the currently authenticated user belongs to the given customer, or is a platform admin (admins are implicitly a member of every customer).';

-- -----------------------------------------------------------------------------
-- Auto-create a profiles row whenever someone signs up / is invited.
-- Runs as SECURITY DEFINER so it can insert into profiles regardless of
-- that table's RLS policies (defined below).
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Auto-creates a matching profiles row whenever a new auth.users row is inserted (sign-up or invite acceptance). Application code never inserts into profiles directly.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere. From this point on, a table with no matching
-- policy denies access by default — nothing is accessible "by accident".
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.websites enable row level security;
alter table public.customer_users enable row level security;
alter table public.audit_logs enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- Everyone can see/update their own profile. Admins can see (not edit)
-- everyone's profile, e.g. to show a name in the "invited users" list.
-- No client-facing INSERT policy: rows are created only by the
-- handle_new_user trigger above.
-- -----------------------------------------------------------------------------

create policy profiles_select_self_or_admin
  on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());

create policy profiles_update_self
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- customers
-- Admins can do everything. A customer user can only SELECT the
-- customer(s) they belong to — they never create/edit/delete a customer
-- record themselves (that's an admin-only action in the dashboard).
-- -----------------------------------------------------------------------------

create policy customers_select_member_or_admin
  on public.customers for select
  using (public.is_customer_member(id));

create policy customers_insert_admin_only
  on public.customers for insert
  with check (public.is_platform_admin());

create policy customers_update_admin_only
  on public.customers for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy customers_delete_admin_only
  on public.customers for delete
  using (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- websites
-- Same shape as customers: members can read their own customer's
-- website(s); only admins create/edit/delete website records (domain,
-- connection key, status, etc.).
-- -----------------------------------------------------------------------------

create policy websites_select_member_or_admin
  on public.websites for select
  using (public.is_customer_member(customer_id));

create policy websites_insert_admin_only
  on public.websites for insert
  with check (public.is_platform_admin());

create policy websites_update_admin_only
  on public.websites for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy websites_delete_admin_only
  on public.websites for delete
  using (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- customer_users
-- A user can always see their own membership row(s) (so the app can ask
-- "which customers do I belong to, and as what role"). Admins can see
-- every row. Only admins create/edit/delete membership rows — this is
-- how "invite a customer user" and "revoke access" work.
-- -----------------------------------------------------------------------------

create policy customer_users_select_self_or_admin
  on public.customer_users for select
  using (user_id = auth.uid() or public.is_platform_admin());

create policy customer_users_insert_admin_only
  on public.customer_users for insert
  with check (public.is_platform_admin());

create policy customer_users_update_admin_only
  on public.customer_users for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy customer_users_delete_admin_only
  on public.customer_users for delete
  using (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- audit_logs
-- Read-only from the client's perspective. Admins see every log entry;
-- a customer user sees only entries logged against their own
-- customer_id. Deliberately NO insert/update/delete policy for
-- anon/authenticated — writes happen only via the service-role client
-- from trusted server code, which bypasses RLS entirely.
-- -----------------------------------------------------------------------------

create policy audit_logs_select_member_or_admin
  on public.audit_logs for select
  using (
    public.is_platform_admin()
    or (customer_id is not null and public.is_customer_member(customer_id))
  );
