-- =============================================================================
-- PLATFORM MIGRATION 0034
-- products.model (text) -> products.models (text[]) — FAZ 9 (ürün başına
-- birden fazla model desteği), migration 0027_products_model_column.sql'in
-- doğrudan devamı/dönüşümü.
--
-- Verified via list_migrations before writing this file: 0033 is the latest
-- applied migration, 0034 is unused. Re-verified again immediately before
-- apply_migration itself runs (same discipline as every migration since
-- 0024 — this repo's own history has a documented file-number-vs-apply-
-- order mismatch, 0023-0028).
--
-- Verified via execute_sql (read-only) before writing this file: exactly
-- one row has a non-empty `model` today (id 26bc0e7d-6e48-4ae1-b0d3-
-- 90553c30c51b, model = 'tp9') — the migration below preserves it as
-- models = ARRAY['tp9'], never dropped or silently discarded.
--
-- STILL FREE TEXT, NOT A CATALOG TABLE: per this phase's own explicit
-- "sabit bir 'modeller' katalog tablosu OLUŞTURMA" instruction — `models`
-- is a plain text[] column, no FK, no fixed value list. Only the
-- CARDINALITY changed (one string -> an array of strings); the "no fixed
-- list, no validation against a catalog" philosophy from migration 0027's
-- own header is unchanged and still applies.
--
-- GIN INDEX: `models` is filtered via containment (`@>`, i.e. Supabase-js's
-- `.contains()`) by both getPublicBrandModels and getPublicProducts's own
-- model filter (lib/commerce/public/{brands,products}.ts) — a GIN index on
-- an array column is what actually makes `@>` queries fast instead of a
-- full sequential scan, same reasoning Postgres's own documentation gives
-- for indexing array/jsonb containment lookups.
-- =============================================================================

alter table public.products add column models text[];

update public.products
set models = array[model]
where model is not null and model <> '';

comment on column public.products.models is
  'FAZ 9 — free-text model attribute(s) (e.g. {"TP9", "TP9 SFx"}), replacing the single-value `model` column (migration 0027, dropped by this migration). No fixed-list enforcement — see migration 0027''s own header for why free text was chosen over a catalog table, unchanged by this migration''s move from scalar to array.';

alter table public.products drop column model;

create index products_models_gin_idx on public.products using gin (models);
