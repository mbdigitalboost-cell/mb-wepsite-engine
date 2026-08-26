-- =============================================================================
-- PLATFORM MIGRATION 0010
-- store_branding, store_navigation_menus, store_navigation_items
--
-- 0008'e bağımlı. `stores`/store_profiles/store_settings'e dokunmuyor.
--
-- İKİLİ RBAC AYRIMI (madde 2): Branding + Navigation "içerik" katmanında —
-- store_editor+ YAZABİLİR (is_store_editor_member), sadece store_admin
-- değil. Ama Navigation'da KALICI SİLME store_admin+'e ayrılmış
-- (is_store_admin_member) — store_editor bir öğeyi PASİFLEŞTİREBİLİR
-- (is_active=false, geri alınabilir) ama SİLEMEZ (geri alınamaz). Bu,
-- kullanıcının "store_editor: kritik yönetim işlemleri yok" talimatının
-- somutlaşmış hâli.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- store_branding — 1:1, görsel/tema tercihleri. SADECE renk/tipografi/
-- buton stili gibi TOKEN'lar — kullanıcıya serbest CSS/HTML yazma imkanı
-- KESİNLİKLE verilmiyor (madde 5). `theme_config` jsonb bile serbest
-- metin değil, app katmanında (Zod) sabit bir anahtar kümesine karşı
-- doğrulanacak (ör. yeni bir renk token'ı), hiçbir zaman ham CSS/HTML
-- string'i olarak saklanmayacak/render edilmeyecek.
-- -----------------------------------------------------------------------------

create table public.store_branding (
  store_id uuid primary key references public.stores (id) on delete cascade,
  primary_color text,
  secondary_color text,
  accent_color text,
  button_style text check (button_style in ('rounded', 'square', 'pill')),
  typography text,
  color_mode text not null default 'light' check (color_mode in ('light', 'dark', 'system')),
  theme_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_branding is
  'Phase 2: 1:1 mağaza marka/tema tercihleri (renk token''ları, tipografi, buton stili, açık/koyu tercih). store_editor+ yazabilir (is_store_editor_member). Sadece TOKEN/enum-benzeri alanlar — asla ham CSS/HTML/JS saklanmaz veya render edilmez. Mağaza aktifse anon-okunabilir (storefront tema uygulaması için).';

create trigger set_store_branding_updated_at
  before update on public.store_branding
  for each row execute function public.set_updated_at();

alter table public.store_branding enable row level security;

create policy store_branding_select_member_or_admin
  on public.store_branding for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy store_branding_select_public_active_store
  on public.store_branding for select
  to anon
  using ((select public.is_store_publicly_visible(store_id)));

create policy store_branding_insert_editor_tier
  on public.store_branding for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy store_branding_update_editor_tier
  on public.store_branding for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy store_branding_delete_admin_tier
  on public.store_branding for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));

-- -----------------------------------------------------------------------------
-- store_navigation_menus — bir mağazanın Ana/Footer/Kategori menülerinin
-- her biri için tek satır (unique(store_id, menu_type)).
--
-- İSİM AYRIMI: bu, customer-template'teki mevcut `navigation_items`
-- (Petra'nın tanıtım sitesi, AYRI bir Supabase projesi, düz/tek seviyeli)
-- ile KARIŞTIRILMAMALI — farklı veritabanları, teknik çakışma yok, ama
-- kasıtlı olarak `store_` prefix'i ile ayrıştırıldı.
-- -----------------------------------------------------------------------------

create table public.store_navigation_menus (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  menu_type text not null check (menu_type in ('main', 'footer', 'category')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_navigation_menus_one_per_type unique (store_id, menu_type),
  -- PHASE 2 CRITICAL REMEDIATION (CRITICAL 1, kısım A — bkz.
  -- PHASE_2_CRITICAL_REMEDIATION_PLAN.md §4): `id` zaten PRIMARY KEY
  -- (dolayısıyla zaten unique) olduğu halde `(id, store_id)` üzerinde AYRICA
  -- bir composite UNIQUE constraint gerekiyor — PostgreSQL'in foreign key
  -- kuralı gereği (bkz. postgresql.org/docs/current/ddl-constraints.html:
  -- "A foreign key must reference columns that form a primary key, unique
  -- constraint, or non-partial unique index"), aşağıdaki
  -- store_navigation_items'ın composite FK'sinin bu çifti referans
  -- alabilmesi için bu unique constraint'in var olması ZORUNLU.
  constraint store_navigation_menus_id_store_id_key unique (id, store_id)
);

comment on table public.store_navigation_menus is
  'Phase 2: bir mağazanın Ana/Footer/Kategori menü konteynerları — her tip için en fazla 1 satır. Menünün kendisi store_editor+ tarafından oluşturulabilir/güncellenebilir; SİLİNMESİ (tüm öğeleriyle cascade) store_admin+''e ayrılmış.';

create trigger set_store_navigation_menus_updated_at
  before update on public.store_navigation_menus
  for each row execute function public.set_updated_at();

create index store_navigation_menus_store_id_idx on public.store_navigation_menus (store_id);

alter table public.store_navigation_menus enable row level security;

create policy store_navigation_menus_select_member_or_admin
  on public.store_navigation_menus for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy store_navigation_menus_select_public_active_store
  on public.store_navigation_menus for select
  to anon
  using ((select public.is_store_publicly_visible(store_id)));

create policy store_navigation_menus_insert_editor_tier
  on public.store_navigation_menus for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy store_navigation_menus_update_editor_tier
  on public.store_navigation_menus for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy store_navigation_menus_delete_admin_tier
  on public.store_navigation_menus for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));

-- -----------------------------------------------------------------------------
-- store_navigation_items — bir menünün gerçek link öğeleri.
--
-- `store_id` menu_id üzerinden JOIN yerine BİLİNÇLİ OLARAK burada da
-- tutuluyor (denormalizasyon) — RLS policy'lerini basit, tek-tablo
-- sorgusu olarak tutmak için (performans + okunabilirlik).
--
-- PHASE 2 CRITICAL REMEDIATION (CRITICAL 1, kısım A — bkz.
-- PHASE_2_CRITICAL_REMEDIATION_PLAN.md §4, PHASE_2_FINAL_SECURITY_REVIEW.md
-- §2 TEST 3): bu dosyanın ÖNCEKİ hali burada "uygulama katmanı doğrular"
-- diyordu ama bu doğrulama HİÇ yazılmamıştı — canlıya karşı
-- (begin;...rollback; ile, gerçek bir store_admin kimliğiyle) bir INSERT
-- denemesiyle KANITLANMIŞ bir cross-tenant enjeksiyon açığına yol açtı:
-- bir mağazanın editörü, KENDİ store_id'siyle ama BAŞKA bir mağazanın
-- menu_id'siyle bir satır ekleyip o mağazanın public navigasyonuna
-- (menu_id'ye göre filtrelenen getPublicStoreNavigation() üzerinden)
-- keyfi içerik enjekte edebiliyordu. Bu artık uygulama koduna DEĞİL,
-- Postgres'in kendi ilişkisel bütünlük motoruna (composite foreign key,
-- aşağıda tablo sonunda) bırakılıyor — hiçbir kod çalışmasa BİLE
-- `menu_id`'nin store_id'si ile bu satırın `store_id`'si eşleşmezse
-- INSERT/UPDATE Postgres tarafından REDDEDİLİR.
--
-- `url` sütunu da aynı incelemede (§4 XSS/Injection) şema kısıtlaması
-- olmadığı için `javascript:`/`data:` gibi payload'lar taşıyabildiği
-- tespit edildi — birincil doğrulama artık lib/validation/safe-url.ts'in
-- ALLOWLIST'i (Zod katmanı), aşağıdaki CHECK constraint'i ise SADECE dar
-- kapsamlı bir DB-seviyesi backstop (bkz. o dosyanın/CHECK'in kendi yorumu).
--
-- `parent_item_id` nullable, kendine referans — ileride nested/alt menü
-- ihtiyacı için hazır (madde 6: "nested navigation gerekiyorsa destek"),
-- ama bu fazın admin UI'ı SADECE düz liste üretiyor/tüketiyor; aynı
-- menüye ait olma zorunluluğu (parent_item_id'nin de aynı menu_id'de
-- olması) bu migration'da HALA bir constraint ile ZORLANMIYOR — bugünkü
-- admin UI hiç nested menü üretmediği için sıfır satırlık, kullanılmayan
-- bir alan; gelecekte nested menü UI'ı eklenirse aynı composite-FK
-- deseniyle sıkılaştırılmalı.
-- -----------------------------------------------------------------------------

create table public.store_navigation_items (
  id uuid primary key default gen_random_uuid(),
  -- NOT: `menu_id`'nin tekil FK'si BİLİNÇLİ OLARAK burada YOK — composite
  -- FK (menu_id, store_id) tablo sonunda tanımlanıyor, tek bir sütunun iki
  -- ayrı FK'ye birden konu olması gerekmiyor/desteklenmiyor.
  menu_id uuid not null,
  store_id uuid not null references public.stores (id) on delete cascade,
  parent_item_id uuid references public.store_navigation_items (id) on delete cascade,
  label text not null,
  -- PHASE 2 CRITICAL REMEDIATION — dar kapsamlı DB backstop (birincil
  -- doğrulama Zod'da, bkz. yukarıki yorum). Sadece bilinen tehlikeli şema
  -- öneklerini (case-insensitive, baştaki boşluk toleranslı) reddeder;
  -- encode edilmiş varyantları/kontrol karakteri triklerini YAKALAMAZ —
  -- bunlar için birincil savunma HER ZAMAN Zod katmanı.
  url text not null check (lower(url) !~ '^\s*(javascript|data|vbscript|file|about|blob)\s*:'),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PHASE 2 CRITICAL REMEDIATION (CRITICAL 1, kısım A) — bu satırın
  -- `store_id`'sinin, bağlı olduğu `menu_id`'nin GERÇEK store_id'siyle
  -- eşleşmesini Postgres'in kendisi zorunlu kılar (bkz. yukarıki dosya
  -- başı yorumu ve store_navigation_menus'un
  -- store_navigation_menus_id_store_id_key unique constraint'i).
  constraint store_navigation_items_menu_store_fkey
    foreign key (menu_id, store_id)
    references public.store_navigation_menus (id, store_id)
    on delete cascade
);

comment on table public.store_navigation_items is
  'Phase 2: bir menünün link öğeleri. store_editor+ oluşturabilir/güncelleyebilir/PASİFLEŞTİREBİLİR (is_active=false); KALICI SİLME store_admin+''e ayrılmış (is_store_admin_member) — "store_editor: kritik yönetim işlemleri yok" kararının somutlaşmış hâli. sort_order client''tan gelen ham değer olarak GÜVENİLMEZ, server transaction''ı kendi yeniden hesaplar (bkz. app/dashboard/.../navigation/actions.ts).';

create trigger set_store_navigation_items_updated_at
  before update on public.store_navigation_items
  for each row execute function public.set_updated_at();

create index store_navigation_items_menu_id_idx on public.store_navigation_items (menu_id);
create index store_navigation_items_store_id_idx on public.store_navigation_items (store_id);
create index store_navigation_items_sort_order_idx on public.store_navigation_items (sort_order);

alter table public.store_navigation_items enable row level security;

create policy store_navigation_items_select_member_or_admin
  on public.store_navigation_items for select
  to authenticated
  using ((select public.is_store_member(store_id)));

create policy store_navigation_items_select_public_active
  on public.store_navigation_items for select
  to anon
  using (is_active = true and (select public.is_store_publicly_visible(store_id)));

create policy store_navigation_items_insert_editor_tier
  on public.store_navigation_items for insert
  to authenticated
  with check ((select public.is_store_editor_member(store_id)));

create policy store_navigation_items_update_editor_tier
  on public.store_navigation_items for update
  to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));

create policy store_navigation_items_delete_admin_tier
  on public.store_navigation_items for delete
  to authenticated
  using ((select public.is_store_admin_member(store_id)));
