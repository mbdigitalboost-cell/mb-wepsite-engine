-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0006
-- Storage bucket for media_assets (Phase 9.4)
--
-- Why this migration exists: `media_assets` (0003) has always stored
-- asset METADATA (file_name, file_url, storage_path, alt_text, type,
-- width, height) — nothing in 0001-0005 ever created a place for the
-- actual file BYTES to live. This migration adds exactly one thing: a
-- Supabase Storage bucket named `media`, so `file_url` can finally point
-- at a real, reachable file instead of a manually-typed external URL.
--
-- `media_assets`' own table schema is UNCHANGED — it was already
-- sufficient (see PHASE_9_4_RAPOR.md §"Şema yeterlilik analizi"). This
-- migration only touches `storage.buckets`, a table Supabase itself
-- manages the Storage API on top of; it does not touch `storage.objects`
-- RLS at all (see the comment below for why that's a deliberate choice,
-- not an oversight).
-- =============================================================================

-- One bucket, generic name ("media") — this file is the CUSTOMER
-- TEMPLATE, applied once per customer's own separate Supabase project,
-- so there's no need to namespace the bucket id by customer the way a
-- shared/multi-tenant bucket would require.
--
-- public = true: this bucket only ever holds already-public marketing
-- assets (hero images, solution/service/project/campaign photos, logos)
-- — the same content class `media_assets` already documented as
-- "publicly readable by design" in migration 0003. A public bucket
-- serves GET requests by URL without going through storage.objects RLS
-- at all (Supabase's documented behavior) — exactly the access pattern
-- the public Petra site needs, and it means anon never needs its own
-- SELECT policy on storage.objects for this to work.
--
-- file_size_limit = 5 MiB, allowed_mime_types = images only: matches
-- this template's asset folder convention (brand/hero/solutions/
-- services/projects/campaigns/banners — all photography/logos, never
-- video or documents). Enforced by Storage itself on every upload
-- attempt, in addition to the same allow-list checked server-side in
-- lib/media/constants.ts before any upload is attempted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do nothing;

-- Deliberately NO storage.objects RLS policies for anon/authenticated —
-- same "server-only writes" pattern already used for `leads` and
-- `tracking_settings` (0005_customer_rls.sql). `storage.objects` has RLS
-- enabled by default on every Supabase project; with zero policies for
-- anon/authenticated, every write (INSERT/UPDATE/DELETE) and every
-- LIST/metadata SELECT against it is denied for those roles — full deny
-- by default, not an oversight. Every upload/delete in this app goes
-- exclusively through the service-role client
-- (lib/cms/connection.ts's getCustomerSupabaseClient(), the same trust
-- boundary the dashboard already uses for every other write), which
-- bypasses storage.objects RLS entirely, same as it bypasses RLS on
-- every other table. Public READ of an uploaded file's bytes (GET by
-- URL) does not depend on storage.objects RLS at all for a public
-- bucket — see the `public = true` comment above.
