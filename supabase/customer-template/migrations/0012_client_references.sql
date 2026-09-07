-- =============================================================================
-- CUSTOMER TEMPLATE MIGRATION 0012
-- client_references
--
-- Homepage "Referanslarımız" teaser (components/sections/references-
-- section.tsx) + full /referanslar page (app/(public)/referanslar/
-- page.tsx) — previously a hardcoded TypeScript array
-- (lib/data/petra/references.ts, ~33 client/institution logos), now an
-- independently editable content type. Follows the same shape/rules as
-- 0011_brands.sql (the proven pattern for this session's content types):
-- no per-row tenant scoping (this whole database already belongs to ONE
-- customer), RLS gates 'published' visibility (see 0005_customer_rls.sql).
--
-- NAMING: the table is deliberately NOT called `references` — that word
-- is a reserved SQL keyword (used in FOREIGN KEY ... REFERENCES syntax)
-- and would require quoting `"references"` everywhere (migration, RLS
-- policies, every adapter/admin query) — a real, avoidable footgun for
-- zero benefit. `client_references` is unambiguous and needs no quoting
-- anywhere. The `ContentTypeKey` string, URL segment, and this table
-- name are all the same value (`client_references`) — required by the
-- generic content engine's `.from(type)` convention.
--
-- FIELDS — deliberately NOT a bare copy of `PetraReference`'s own field
-- names, but the MINIMUM needed to preserve today's public behavior
-- unchanged (see lib/data/petra/references.ts + components/sections/
-- references/* for what each field currently drives):
--   - `name` (not `logo`-adjacent) — the institution/client name.
--   - `category` — free text (not a DB enum/CHECK) — same "trust the
--     admin, no new `select` field kind" choice already made for
--     `projects.category`/`product_showcase_items.category`. The public
--     mapper (mapClientReferenceRows, lib/cms/petra/mappers.ts) falls
--     back to "Diğer Projeler" for any value outside the 5 known
--     categories, so a typo never silently drops a reference from
--     /referanslar's grouped list.
--   - `image` (not `logo`) — matches the OTHER 8 content types' uniform
--     "image"-kind field key convention (brands/product_showcase_items/
--     services/solutions/projects/campaigns/testimonials all use
--     `image`), even though the static `PetraReference` type's own field
--     is called `logo` — the mapper does this one rename.
--   - `is_real_logo` (boolean, NEW — no equivalent in `brands`/
--     `product_showcase_items`) — replaces `PetraReference.logoType`
--     ("real"|"fallback"). Genuinely necessary to preserve today's
--     visible design: `ReferenceLogo` (components/sections/references/
--     reference-logo.tsx) renders a REAL logo with a light background +
--     its own alt text ("<name>"), and a FALLBACK badge with a dark
--     background + "<name> referans işareti" alt text — dropping this
--     field would either lose that visual distinction for the 2 real-
--     logo entries (Bahçeşehir Koleji, KSÜ Tıp Fakültesi) or force
--     inventing a fake "official logo" label for a fallback badge,
--     which the source pack's own usage terms explicitly forbid (see
--     lib/data/petra/references.ts's file header).
--   - `featured` (boolean, NEW — no equivalent in `brands`/
--     `product_showcase_items`) — replaces `PetraReference.featured`.
--     Genuinely necessary: the homepage teaser shows a curated 9-of-33
--     subset (specific institutions chosen for category diversity + both
--     real logos — see lib/data/petra/references.ts, whose own header
--     comment says "10"; the actual array has exactly 9 `featured: true`
--     rows, verified by count — a pre-existing doc inaccuracy in that
--     file, not a data-loss bug here: this migration's seed below
--     preserves the SAME 9 rows, verbatim), not "the first N by
--     sort_order" — without this field
--     there would be no way to reproduce that curated subset from the
--     DB, forcing either showing all 33 on the homepage (breaks the
--     "condensed teaser" design) or an arbitrary substitute selection
--     (a silent design change) — both would violate this faz's explicit
--     "public tasarım korunacak" rule.
--   - No `slug` — `PetraReference` itself has no slug field (no detail
--     route exists or is planned, see `href` note below), and every
--     admin CRUD action already targets rows by `id` (uuid), not slug —
--     adding one would be a genuinely unused column (`brands`/
--     `product_showcase_items` kept `slug` only because their OWN static
--     types already had it; this one's static type does not).
--   - No `href` — `PetraReference.href` exists in the static type but is
--     ALWAYS `null` there and is NEVER rendered as a real `<a href>`
--     anywhere in the current components (reference rows/cards are
--     `<button>`s, not links — see reference-list.tsx's own comment on
--     why). Adding a DB column for a field the UI cannot currently act
--     on would be the "gereksiz alan" this faz explicitly warns against.
--   - No `customer_id` — this template has none anywhere; tenant
--     isolation is at the database level (one Supabase project per
--     customer), not row level, confirmed by every other table in
--     0002/0008/0011.
-- =============================================================================

create table public.client_references (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  image text,
  is_real_logo boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_references is
  'Homepage "Referanslarımız" teaser + full /referanslar page — one independent row per client/institution reference logo.';

create trigger set_client_references_updated_at
  before update on public.client_references
  for each row execute function public.set_updated_at();

create index client_references_status_idx on public.client_references (status);
create index client_references_sort_order_idx on public.client_references (sort_order);

-- -----------------------------------------------------------------------------
-- RLS — identical pattern to every other content table (0005_customer_rls.sql
-- / 0011_brands.sql): anon/authenticated may SELECT only 'published' rows;
-- no insert/update/delete policy for anon/authenticated anywhere (RLS
-- enabled + zero write policies = full deny); service_role (the admin
-- dashboard's connection, lib/cms/connection.ts's
-- getCustomerSupabaseClient()) bypasses RLS entirely, same trust boundary
-- as every other write in this app. No cross-tenant exposure is possible
-- — this table lives in Petra's own, separate Supabase project, which no
-- other customer/Central-Store connection can reach.
-- -----------------------------------------------------------------------------

alter table public.client_references enable row level security;

create policy client_references_public_select on public.client_references
  for select to anon, authenticated
  using (status = 'published');

-- -----------------------------------------------------------------------------
-- Seed — the 33 real references currently hardcoded in
-- lib/data/petra/references.ts, migrated verbatim (same name/category/
-- image/is_real_logo/featured values, same relative order). `sort_order`
-- = static `order` - 1 (0-based, matching this template's own convention
-- for every other seeded content type). No new/invented reference.
-- `status = 'published'` so the public site's appearance is unchanged
-- the moment this migration is applied and the adapter is wired (same
-- "zero visual change on apply" rule as 0008's/0011's seed).
-- -----------------------------------------------------------------------------

insert into public.client_references (name, category, image, is_real_logo, featured, sort_order, status) values
  ('Elbistan İlçe Sağlık', 'Kamu & Sağlık', '/images/petra/references/elbistan-ilce-saglik.svg', false, true, 0, 'published'),
  ('Türkoğlu Hükümet Konağı', 'Kamu & Sağlık', '/images/petra/references/turkoglu-hukumet-konagi.svg', false, false, 1, 'published'),
  ('Beyoğlu ASM', 'Kamu & Sağlık', '/images/petra/references/beyoglu-asm.svg', false, false, 2, 'published'),
  ('Şekeroba ASM', 'Kamu & Sağlık', '/images/petra/references/sekeroba-asm.svg', false, false, 3, 'published'),
  ('KSÜ Tıp Fakültesi Onkoloji Bölümü', 'Kamu & Sağlık', '/images/petra/references/ksu-tip-fakultesi.png', true, true, 4, 'published'),
  ('KSÜ Fen Edebiyat Fakültesi', 'Kamu & Sağlık', '/images/petra/references/ksu-fen-edebiyat-fakultesi.svg', false, false, 5, 'published'),
  ('KSÜ Mühendislik Fakültesi', 'Kamu & Sağlık', '/images/petra/references/ksu-muhendislik-fakultesi.svg', false, false, 6, 'published'),
  ('Orkis Termal Otel', 'Turizm & Konaklama', '/images/petra/references/orkis-termal-otel.svg', false, true, 7, 'published'),
  ('Adanis Park Termal Otel', 'Turizm & Konaklama', '/images/petra/references/adanis-park-termal-otel.svg', false, false, 8, 'published'),
  ('Dögele Termal Oteller', 'Turizm & Konaklama', '/images/petra/references/dogele-termal-oteller.svg', false, false, 9, 'published'),
  ('Grand Maraş Termal Otel', 'Turizm & Konaklama', '/images/petra/references/grand-maras-termal-otel.svg', false, true, 10, 'published'),
  ('Karbak Metal', 'Ticari & Endüstriyel', '/images/petra/references/karbak-metal.svg', false, true, 11, 'published'),
  ('Eslon Mutfak Eşyaları', 'Ticari & Endüstriyel', '/images/petra/references/eslon-mutfak-esyalari.svg', false, false, 12, 'published'),
  ('Doğa Koleji', 'Eğitim', '/images/petra/references/doga-koleji.svg', false, false, 13, 'published'),
  ('Bahçeşehir Koleji', 'Eğitim', '/images/petra/references/bahcesehir-koleji.jpg', true, true, 14, 'published'),
  ('Özel ATK Koleji', 'Eğitim', '/images/petra/references/ozel-atk-koleji.svg', false, false, 15, 'published'),
  ('CKC Hukuk Bürosu', 'Diğer Projeler', '/images/petra/references/ckc-hukuk-burosu.svg', false, true, 16, 'published'),
  ('CKC Villa', 'Diğer Projeler', '/images/petra/references/ckc-villa.svg', false, false, 17, 'published'),
  ('Karacasu Taziye Evi', 'Diğer Projeler', '/images/petra/references/karacasu-taziye-evi.svg', false, false, 18, 'published'),
  ('Kumçatı Taziye Evi', 'Diğer Projeler', '/images/petra/references/kumcati-taziye-evi.svg', false, false, 19, 'published'),
  ('Altınşehir Eskikale Gold', 'Diğer Projeler', '/images/petra/references/altinsehir-eskikale-gold.svg', false, false, 20, 'published'),
  ('Altınşehir Akben Kuyumculuk', 'Diğer Projeler', '/images/petra/references/altinsehir-akben-kuyumculuk.svg', false, false, 21, 'published'),
  ('Altınşehir Arı Kuyumculuk', 'Diğer Projeler', '/images/petra/references/altinsehir-ari-kuyumculuk.svg', false, false, 22, 'published'),
  ('Altınşehir Arı Kuyumculuk 2', 'Diğer Projeler', '/images/petra/references/altinsehir-ari-kuyumculuk-2.svg', false, false, 23, 'published'),
  ('HG Hospital', 'Diğer Projeler', '/images/petra/references/hg-hospital.svg', false, false, 24, 'published'),
  ('Doğa Anaokulu', 'Eğitim', '/images/petra/references/doga-anaokulu.jpg', false, false, 25, 'published'),
  ('Emlak Katılım Bankası', 'Ticari & Endüstriyel', '/images/petra/references/emlak-katilim-bankasi.jpg', false, false, 26, 'published'),
  ('Halkbank Pazarcık Şubesi', 'Ticari & Endüstriyel', '/images/petra/references/halkbank-pazarcik-subesi.jpg', false, true, 27, 'published'),
  ('Halkbank Sanayi Şubesi', 'Ticari & Endüstriyel', '/images/petra/references/halkbank-sanayi-subesi.jpg', false, false, 28, 'published'),
  ('Sular Hastanesi Klima Santrali / Steril Hava', 'Kamu & Sağlık', '/images/petra/references/sular-hastanesi-klima-santrali.jpg', false, true, 29, 'published'),
  ('Andırın ASM', 'Kamu & Sağlık', '/images/petra/references/andirin-asm.jpg', false, false, 30, 'published'),
  ('Mağralı Taziye Evi', 'Diğer Projeler', '/images/petra/references/magrali-taziye-evi.jpg', false, false, 31, 'published'),
  ('Mağralı Bilgi Kültür Evi', 'Diğer Projeler', '/images/petra/references/magrali-bilgi-kultur-evi.jpg', false, false, 32, 'published');
