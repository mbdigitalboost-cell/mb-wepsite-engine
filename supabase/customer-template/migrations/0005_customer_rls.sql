-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0005
-- Row Level Security for every table in this customer's project
--
-- Model (deliberately simpler than the Platform project's RLS — there is
-- no per-row tenant scoping here, because this whole database belongs to
-- ONE customer already):
--
--   PUBLIC (anon, authenticated):
--     - content tables (site_settings, pages, hero_sections, services,
--       solutions, projects, campaigns, testimonials, faqs,
--       navigation_items): SELECT WHERE status = 'published' only.
--       'draft' and 'archived' rows are invisible to anon/authenticated,
--       full stop.
--     - seo_settings, media_assets: SELECT, unconditional (no status
--       column on these — see 0003's comments for why).
--     - tracking_settings: NO SELECT policy at all. Public access to the
--       3 safe fields goes through the tracking_public_settings VIEW
--       instead (created in 0003), never the base table.
--     - leads: NO SELECT, NO INSERT. Nothing public-facing touches this
--       table in this phase.
--   WRITE (anon, authenticated): DENY on every single table. No INSERT/
--   UPDATE/DELETE policies are created for anon or authenticated
--   anywhere in this file — RLS defaults to deny when a table has RLS
--   enabled and no matching policy, so simply not writing a policy IS
--   the deny.
--   service_role: implicitly bypasses RLS entirely (Postgres/Supabase
--   default for the service_role/table-owner class of role) — full
--   SELECT/INSERT/UPDATE/DELETE on every table. This is what
--   lib/cms/connection.ts's getCustomerSupabaseClient() uses.
-- =============================================================================

alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.hero_sections enable row level security;
alter table public.services enable row level security;
alter table public.solutions enable row level security;
alter table public.projects enable row level security;
alter table public.campaigns enable row level security;
alter table public.testimonials enable row level security;
alter table public.faqs enable row level security;
alter table public.navigation_items enable row level security;
alter table public.seo_settings enable row level security;
alter table public.tracking_settings enable row level security;
alter table public.media_assets enable row level security;
alter table public.leads enable row level security;

-- -----------------------------------------------------------------------------
-- Content tables — published-only public SELECT
-- -----------------------------------------------------------------------------

create policy site_settings_public_select on public.site_settings
  for select to anon, authenticated
  using (status = 'published');

create policy pages_public_select on public.pages
  for select to anon, authenticated
  using (status = 'published');

create policy hero_sections_public_select on public.hero_sections
  for select to anon, authenticated
  using (status = 'published');

create policy services_public_select on public.services
  for select to anon, authenticated
  using (status = 'published');

create policy solutions_public_select on public.solutions
  for select to anon, authenticated
  using (status = 'published');

create policy projects_public_select on public.projects
  for select to anon, authenticated
  using (status = 'published');

create policy campaigns_public_select on public.campaigns
  for select to anon, authenticated
  using (status = 'published');

create policy testimonials_public_select on public.testimonials
  for select to anon, authenticated
  using (status = 'published');

create policy faqs_public_select on public.faqs
  for select to anon, authenticated
  using (status = 'published');

create policy navigation_items_public_select on public.navigation_items
  for select to anon, authenticated
  using (status = 'published');

-- -----------------------------------------------------------------------------
-- seo_settings / media_assets — unconditional public SELECT (no status
-- column, nothing sensitive in either table)
-- -----------------------------------------------------------------------------

create policy seo_settings_public_select on public.seo_settings
  for select to anon, authenticated
  using (true);

create policy media_assets_public_select on public.media_assets
  for select to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- tracking_settings — intentionally NO select policy for anon/authenticated.
-- Public reads go through the tracking_public_settings view (0003), which
-- runs with the view owner's privileges and therefore is not blocked by
-- this table's RLS despite exposing none of its own policies here. Grant
-- SELECT on the view (not the table) to anon/authenticated:
-- -----------------------------------------------------------------------------

grant select on public.tracking_public_settings to anon, authenticated;

-- -----------------------------------------------------------------------------
-- leads — intentionally NO policy at all for anon/authenticated (neither
-- select nor insert). service_role only.
-- -----------------------------------------------------------------------------

-- (no policies created for public.leads — RLS enabled + zero policies = full deny for anon/authenticated)

-- -----------------------------------------------------------------------------
-- No INSERT/UPDATE/DELETE policies for anon or authenticated on ANY table
-- in this file — this is deliberate, not an oversight. Every write in
-- this system goes through server-side, trusted code using the
-- service-role client (lib/cms/connection.ts's getCustomerSupabaseClient),
-- exactly like the Platform project's audit_logs table has no
-- client-facing insert policy either (see supabase/platform/migrations/0004_platform_rls.sql).
-- -----------------------------------------------------------------------------
