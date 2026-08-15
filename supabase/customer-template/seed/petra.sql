-- =============================================================================
-- PETRA SEED — verified data only
--
-- Run this AFTER applying supabase/customer-template/migrations/0001-0005
-- to Petra's own (real) Supabase project. NOT run automatically, NOT run
-- against any project in this sandbox — no real Petra Supabase project
-- exists yet (see Phase 6 report). Verified functionally against a local
-- test Postgres with the same 5 migrations applied — see that report for
-- the test log.
--
-- SOURCE OF TRUTH: every value below is copied verbatim from
-- lib/data/petra/*.ts (already-verified, already-live static content —
-- see those files' own comments for how each value was confirmed). This
-- script does not add, guess, or embellish a single fact beyond what's
-- already in that source.
--
-- Everything here is inserted as status = 'draft'. Seeding does not
-- publish anything — an admin/customer user must explicitly hit
-- "Yayınla" in the dashboard (Phase 6 §18) before any of this becomes
-- visible on the public site. This is deliberate even though the data
-- itself is real: the publish step should always be a conscious action.
--
-- Explicitly NOT seeded, per Phase 6 §3/§9/§10/§11 instruction:
--   - phone/whatsapp/email/address/working_hours beyond what's already
--     confirmed in lib/data/petra/site-config.ts (whatsapp, email,
--     address, working_hours are NULL there — stay NULL here too)
--   - any project (projects table stays empty)
--   - any campaign (campaigns table stays empty)
--   - any testimonial (testimonials table stays empty)
--   - any "Yetkili Bayi ve Servis" or similar unverified dealer claim
--   - any statistic (1000+ customers, 500+ projects, 15+ years — none
--     of these exist in lib/data/petra/statistics.ts as confirmed
--     values, so none are seeded)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- site_settings — from lib/data/petra/site-config.ts
-- Only phone, service_area and alternate_name are confirmed; every other
-- field is genuinely NULL in the source file and stays NULL here.
-- -----------------------------------------------------------------------------

insert into public.site_settings (
  company_name, alternate_name, phone, whatsapp, email, address,
  service_area, working_hours, logo, logo_white, favicon,
  primary_color, secondary_color, radius, button_style, status
) values (
  'Petra Mühendislik',
  'Petra İklimlendirme',
  '0535 791 11 96',
  null, -- WhatsApp not separately confirmed — do not assume it equals phone
  null,
  null, -- candidate address exists but format is unresolved (see site-config.ts) — stays unset
  'Onikişubat, Kahramanmaraş',
  null,
  null, null, null, -- real asset files not uploaded yet (see media library)
  null, null, null, null,
  'draft'
);

-- -----------------------------------------------------------------------------
-- hero_sections — from lib/data/petra/hero.ts (site-wide, page_id NULL)
-- -----------------------------------------------------------------------------

insert into public.hero_sections (
  page_id, heading, subtext, cta_primary_label, cta_primary_href,
  cta_secondary_label, cta_secondary_href, background_image, status
) values (
  null,
  $$İKLİMLENDİRMEDE MÜHENDİSLİK VE GÜVEN.$$,
  'Konut ve ticari alanlar için profesyonel iklimlendirme çözümleri.',
  'Keşif Talep Et',
  '/iletisim',
  $$WhatsApp'tan Ulaş$$,
  null, -- resolved client-side from whatsapp number, see lib/data/petra/whatsapp.ts
  null, -- real hero photography not uploaded yet
  'draft'
);

-- -----------------------------------------------------------------------------
-- solutions — from lib/data/petra/solutions.ts. Slugs copied verbatim —
-- these MUST match the existing public route slugs
-- (app/(public)/cozumler/[slug]/page.tsx) exactly, or the CMS row would
-- silently point at a route that doesn't exist. Do not "correct" or
-- rename any of these.
-- -----------------------------------------------------------------------------

insert into public.solutions (title, slug, description, image, sort_order, status) values
  ('Split Klimalar', 'split-klimalar', 'Split klima sistemleri, tek bir iç ve dış üniteden oluşan, konut ve küçük ölçekli ticari mekanlar için uygun iklimlendirme çözümüdür.', null, 0, 'draft'),
  ('Multi-Split Klimalar', 'multi-split-klimalar', 'Multi-split sistemler, tek bir dış üniteye bağlı birden fazla iç ünite ile farklı odaların bağımsız şekilde iklimlendirilmesini sağlar.', null, 1, 'draft'),
  ('Profesyonel Klimalar', 'profesyonel-klimalar', $$Ofis, mağaza ve endüstriyel alanlar gibi daha büyük mekanlar için tasarlanmış, yüksek kapasiteli profesyonel klima sistemleri.$$, null, 2, 'draft'),
  ('VRF Sistemleri', 'vrf-sistemleri', $$VRF (Variable Refrigerant Flow) sistemleri, büyük binalarda farklı bölgelerin bağımsız ve verimli şekilde iklimlendirilmesini sağlayan gelişmiş bir teknolojidir.$$, null, 3, 'draft'),
  ('Isı Pompaları', 'isi-pompalari', $$Isı pompaları, çevredeki havadan ısı enerjisi transfer ederek hem ısıtma hem soğutma yapabilen, enerji verimliliği yüksek sistemlerdir.$$, null, 4, 'draft'),
  ('Sıcak Su Sistemleri', 'sicak-su-sistemleri', 'Konut ve ticari yapılar için verimli ve sürdürülebilir sıcak su üretim çözümleri.', null, 5, 'draft');

-- -----------------------------------------------------------------------------
-- services — from lib/data/petra/services.ts. No slug/route mapping
-- exists for services today (unlike solutions), so slugs are generated
-- generically here (kebab-case of the title) purely for the required
-- `slug` column — nothing public currently links to them by slug.
-- -----------------------------------------------------------------------------

insert into public.services (title, slug, description, image, sort_order, status) values
  ('Satış', 'satis', 'İhtiyacınıza uygun iklimlendirme sistemlerinin satışı ve danışmanlığı.', null, 0, 'draft'),
  ('Keşif', 'kesif', 'Mekanınızı yerinde değerlendirip doğru çözümü belirliyoruz.', null, 1, 'draft'),
  ('Projelendirme', 'projelendirme', 'İhtiyaca özel sistem tasarımı ve teknik projelendirme.', null, 2, 'draft'),
  ('Kurulum', 'kurulum', 'Profesyonel montaj ve devreye alma süreci.', null, 3, 'draft'),
  ('Teknik Servis', 'teknik-servis', 'Kurulum sonrası bakım ve teknik servis desteği.', null, 4, 'draft');

-- -----------------------------------------------------------------------------
-- faqs — from lib/data/petra/faqs.ts, verbatim.
-- -----------------------------------------------------------------------------

insert into public.faqs (question, answer, sort_order, status) values
  ('Hangi klima benim için uygun?', $$Doğru sistem; mekanınızın büyüklüğüne, kullanım amacına ve yapı özelliklerine göre değişir. Keşif hizmetimizle ihtiyacınıza en uygun çözümü birlikte belirliyoruz.$$, 0, 'draft'),
  ('Keşif hizmeti sunuyor musunuz?', $$Evet. Mekanınızı yerinde inceleyip ihtiyacınıza uygun sistemi ve kurulum planını birlikte belirliyoruz.$$, 1, 'draft'),
  ('Klima montajı yapıyor musunuz?', 'Evet, satışını yaptığımız sistemlerin profesyonel kurulumunu da gerçekleştiriyoruz.', 2, 'draft'),
  ('VRF sistemleri hangi yapılarda kullanılır?', $$VRF sistemleri, farklı bölgelerin bağımsız şekilde iklimlendirilmesi gereken büyük konut ve ticari yapılarda tercih edilir.$$, 3, 'draft'),
  ('Isı pompası nedir?', $$Isı pompası, çevredeki hava enerjisini kullanarak hem ısıtma hem soğutma yapabilen, enerji verimliliği yüksek bir sistemdir.$$, 4, 'draft'),
  ('Servis süreciniz nasıl ilerliyor?', $$Kurulum sonrasında teknik servis desteği sağlıyoruz. Talebinizi ilettikten sonra süreci sizinle birlikte planlıyoruz.$$, 5, 'draft');

-- -----------------------------------------------------------------------------
-- navigation_items — from lib/data/petra/navigation.ts, verbatim.
-- -----------------------------------------------------------------------------

insert into public.navigation_items (label, href, sort_order, status) values
  ('Ana Sayfa', '/', 0, 'draft'),
  ('Çözümler', '/cozumler', 1, 'draft'),
  ('Hizmetler', '/hizmetler', 2, 'draft'),
  ('Projeler', '/projeler', 3, 'draft'),
  ('Kampanyalar', '/kampanyalar', 4, 'draft'),
  ('Hakkımızda', '/hakkimizda', 5, 'draft'),
  ('İletişim', '/iletisim', 6, 'draft');

-- -----------------------------------------------------------------------------
-- Deliberately NOT seeded: projects, campaigns, testimonials,
-- tracking_settings (no real GA4/GTM/Pixel IDs exist yet), seo_settings
-- (no confirmed per-page SEO copy beyond what's already in
-- lib/seo/structured-data.ts), media_assets (no real files uploaded yet),
-- leads (leads are created by real visitors, never seeded).
-- -----------------------------------------------------------------------------
