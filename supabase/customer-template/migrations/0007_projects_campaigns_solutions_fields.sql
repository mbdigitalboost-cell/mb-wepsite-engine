-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0007
-- Projects/Campaigns/Solutions field gaps (Phase 9.6)
--
-- NAMING NOTE: Phase 9.2's report proposed this as "0006_...". By the
-- time this phase started, 0006 had already been taken by Phase 9.4's
-- 0006_media_storage_bucket.sql (applied to the real Petra project
-- before this phase began) — so this is 0007, not 0006. Renumbering an
-- already-applied migration would be worse than a one-off naming
-- mismatch with an old report. See PHASE_9_6_RAPOR.md.
--
-- Every gap below was verified against the ACTUAL component code (not
-- assumed) before being added here — see PHASE_9_6_RAPOR.md
-- "Şema yeterlilik analizi" for the file-by-file evidence. All five new
-- columns are nullable, no NOT NULL / no default — existing rows
-- (6 draft `solutions` rows in the real Petra DB as of this migration)
-- are completely unaffected; every mapper function treats null as
-- "fall back to existing behavior", never as an error.
-- =============================================================================

-- components/sections/projects.tsx renders a category badge
-- (`project.category`) when present, nothing when null. The static
-- `PetraProject.category` type already models this as nullable — this
-- column just gives a CMS-sourced project the same capability a
-- hand-written static project already has. No column existed before;
-- lib/cms/petra/mappers.ts's mapProjectRows() always mapped this to
-- `null` (never fabricated) until now.
alter table public.projects add column category text;

-- components/sections/campaigns.tsx renders `campaign.priceLabel` only
-- when present (never invents pricing) — same rule as the static
-- petraCampaigns data. No column existed before; mapCampaignRows()
-- always mapped this to `null`.
alter table public.campaigns add column price_label text;

-- components/sections/campaigns.tsx always renders a CTA button
-- (`campaign.ctaLabel` / `campaign.ctaHref`, both non-nullable in the
-- PetraCampaign type). Before this migration there was no column, so
-- lib/cms/petra/mappers.ts's mapCampaignRows() hardcoded a generic
-- engine-level default ("İletişime Geç" -> /iletisim) for every
-- CMS-sourced campaign. That default is NOT removed by this migration —
-- it remains the fallback when these columns are null — but a customer
-- can now optionally override the CTA text/link per campaign (e.g. a
-- campaign-specific landing page or a WhatsApp deep link) via the
-- dashboard. `cta_href` is plain text, not URL-validated at the DB or
-- Zod level, on purpose: the default value itself ("/iletisim") is a
-- relative in-site path, matching how hero_sections.cta_primary_href
-- already works (lib/validation/content.ts's heroFormSchema does not
-- require an absolute URL either).
alter table public.campaigns add column cta_label text;
alter table public.campaigns add column cta_href text;

-- app/(public)/cozumler/page.tsx (list) renders `solution.shortDescription`
-- in each card; app/(public)/cozumler/[slug]/page.tsx (detail) renders
-- `solution.longDescription`. The static lib/data/petra/solutions.ts
-- genuinely has two different strings per solution (a one-line teaser vs
-- a full paragraph) — this is real, verified content structure, not a
-- hypothetical. Until now `solutions` had one `description` column, so
-- a CMS-sourced solution showed identical text in both places
-- (documented as a known cosmetic limitation in
-- app/(public)/cozumler/[slug]/page.tsx's comment, now resolved).
-- `description` is kept, unrenamed, and continues to serve as the long/
-- detail-page text (mapSolutionRows() maps it to `longDescription`) —
-- this avoids a rename that would require updating every existing row
-- and any external tooling pointed at the old column name. The new
-- column is additive only.
alter table public.solutions add column short_description text;

comment on column public.projects.category is
  'Optional category badge shown on /projeler (e.g. "Ticari", "Konut"). Null = no badge rendered, never a fabricated label.';
comment on column public.campaigns.price_label is
  'Optional customer-confirmed pricing text (e.g. "50.900 TL''den başlayan fiyatlarla"). Null = no price shown, never invented.';
comment on column public.campaigns.cta_label is
  'Optional per-campaign CTA button text. Null = falls back to the engine-wide default ("İletişime Geç") in lib/cms/petra/mappers.ts.';
comment on column public.campaigns.cta_href is
  'Optional per-campaign CTA button link (relative or absolute). Null = falls back to the engine-wide default ("/iletisim") in lib/cms/petra/mappers.ts.';
comment on column public.solutions.short_description is
  'Optional short/teaser text shown on the /cozumler list card. Null = falls back to the existing `description` column (same text shown in both places, the pre-migration behavior) in lib/cms/petra/mappers.ts''s mapSolutionRows().';

-- No RLS changes needed or made: 0005_customer_rls.sql's `solutions`/
-- `projects`/`campaigns` policies are row-level (`status = 'published'`
-- for anon/authenticated SELECT, full deny for anon/authenticated
-- WRITE) and apply to every column of an allowed row automatically —
-- adding a nullable column does not require a new policy. Verified live
-- against the real Petra DB after this migration (see
-- PHASE_9_6_RAPOR.md "RLS canlı doğrulama").
