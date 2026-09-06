-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0010
-- solutions.seo_title / seo_description / seo_og_image — dynamic detail
-- page SEO override (Faz 6F-4A-3.4.1)
--
-- Only `solutions` gets these columns: it is the only content type with a
-- real dynamic detail route (/cozumler/[slug]) today. services/projects/
-- campaigns have a `slug` column but no [slug] route reads it (see
-- claude/FAZ6F4A3_4_DYNAMIC_SEO_PREFLIGHT.md §1) — adding SEO columns
-- there now would be dormant, unread data, so they are deliberately left
-- untouched.
--
-- All three columns are nullable, no default: NULL means "no per-solution
-- SEO override", not "hide this page". Approved public fallback chain
-- (wiring is a separate phase, 6F-4A-3.4.1.3; this migration only adds
-- the columns): per-solution override (these columns) -> site-wide SEO
-- (seo_settings, route_key IS NULL) -> the solution's own title/
-- short_description/image (unchanged today).
--
-- No new table, no FK, no polymorphic relation, seo_settings is not
-- touched or made dynamic. No new constraint, no new index — plain
-- additive columns, same shape as 0007's category/price_label/
-- short_description additions.
--
-- RLS: no change needed or made. solutions_public_select
-- (0005_customer_rls.sql) is `for select ... using (status = 'published')`
-- — a row-level policy already covers every column of an allowed row,
-- new ones included (verified live for this exact pattern in 0007's own
-- migration comment). Existing rows: all three columns are nullable with
-- no default, so every existing solutions row gets NULL automatically —
-- no backfill, no data loss, existing public queries (select("*")) keep
-- working unchanged.
-- =============================================================================

alter table public.solutions
  add column seo_title text,
  add column seo_description text,
  add column seo_og_image text;

comment on column public.solutions.seo_title is
  'Optional per-solution SEO title override for /cozumler/[slug]. NULL = falls back to solutions.title.';
comment on column public.solutions.seo_description is
  'Optional per-solution SEO description override for /cozumler/[slug]. NULL = falls back to solutions.short_description (itself falling back to description).';
comment on column public.solutions.seo_og_image is
  'Optional per-solution Open Graph image override for /cozumler/[slug]. NULL = no OG image set (does not fall back to solutions.image — that asset is often a vertical 3:4 crop, not an OG-friendly aspect ratio).';
