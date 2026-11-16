-- =============================================================================
-- PLATFORM MIGRATION 0048
-- Faz 33 — satıcı kimliği, yasal metinler (sürümlü) ve siparişte sözleşme kaydı.
--
-- 1) store_seller_profiles — mağaza başına satıcı kimliği (Mesafeli
--    Sözleşmeler Yönetmeliği m.5/a, 6563 ETK m.3 tanıtıcı bilgiler, 6698
--    KVKK m.10 veri sorumlusu). store_profiles GENİŞLETİLMEDİ: o tablo
--    vitrinin görünen profili (logo, açıklama, sosyal linkler) ve
--    business_info serbest bir jsonb; yasal kimlik ise tipli, doğrulanan,
--    ayrı denetlenen alanlar ister. Bilinmeyen alan (MERSİS, KEP, ETBİS)
--    NULL kalır ve metinlerde o satır hiç çıkmaz.
--
-- 2) store_legal_documents — her yayımlama YENİ SÜRÜM satırıdır; eski
--    sürümler silinmez/değişmez (siparişler hangi sürümü kabul ettiğini
--    gösterir). Bir satırda sonradan yalnız "hukukçu kontrol etti" alanları
--    değişebilir (trigger). Vitrin yalnız store_public_legal_documents
--    view'ı üzerinden HER TÜRÜN SON SÜRÜMÜNÜ okur (taban tabloda anon
--    policy yok).
--
-- 3) order_legal_acceptances — sipariş başına kabul kaydı: kabul edilen
--    ön bilgilendirme + mesafeli satış sürüm id'leri, kabul zamanı, sipariş
--    bilgileriyle doldurulmuş metnin ANLIK GÖRÜNTÜSÜ (şablon sonradan
--    değişse de müşterinin onayladığı metin değişmez) ve AYRI, opsiyonel
--    ticari elektronik ileti onayı. Yazma yalnız service-role (vitrin
--    createOrderAction); okuma editor+ (admin sipariş detayı). Müşteri
--    kendi kaydını sunucu üzerinden (üye oturumu / misafir imzalı jeton)
--    görür. Sipariş durdukça kayıt kalır (orders on delete cascade —
--    siparişler zaten kalıcı silinmiyor).
--
-- Bu dosya ŞEMA + satıcı kimliği tohumudur. Şablon metinlerin tohumu
-- 0049_legal_document_seed.sql'dedir (docs/legal-templates/*.md'den üretilir).
-- =============================================================================

-- 1) Satıcı kimliği -------------------------------------------------------------
create table if not exists public.store_seller_profiles (
  store_id uuid primary key references public.stores (id) on delete cascade,
  legal_name text not null check (char_length(btrim(legal_name)) between 1 and 200),
  owner_name text check (owner_name is null or char_length(owner_name) <= 200),
  tax_number text check (tax_number is null or tax_number ~ '^[0-9]{10,11}$'),
  tax_office text check (tax_office is null or char_length(tax_office) <= 120),
  mersis_number text check (mersis_number is null or mersis_number ~ '^[0-9]{16}$'),
  address text check (address is null or char_length(address) <= 500),
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 200),
  kep_address text check (kep_address is null or char_length(kep_address) <= 200),
  etbis_info text check (etbis_info is null or char_length(etbis_info) <= 300),
  etbis_url text check (etbis_url is null or etbis_url ~ '^https://'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.store_seller_profiles is
  'Faz 33 — mağaza başına satıcı kimliği (MSY m.5/a, ETK m.3, KVKK m.10). Vitrin okur (yayındaki mağaza), editor okur, admin yazar. Bilinmeyen alan NULL — metinde satır hiç çıkmaz.';

create trigger set_store_seller_profiles_updated_at
  before update on public.store_seller_profiles
  for each row execute function public.set_updated_at();

alter table public.store_seller_profiles enable row level security;

create policy store_seller_profiles_select_public on public.store_seller_profiles
  for select to anon, authenticated using ((select public.is_store_publicly_visible(store_id)));
create policy store_seller_profiles_select_editor_tier on public.store_seller_profiles
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy store_seller_profiles_insert_admin_tier on public.store_seller_profiles
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_seller_profiles_update_admin_tier on public.store_seller_profiles
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

-- Taktikalp46 (kullanıcının onayladığı güncel bilgiler; MERSİS/KEP/ETBİS bilinmiyor → NULL).
insert into public.store_seller_profiles (store_id, legal_name, owner_name, tax_number, tax_office, mersis_number, address, phone, email, kep_address, etbis_info, etbis_url)
select s.id, 'TAKTİKALP46', 'Alperen Önsel', '52612445762', 'Aslanbey VD', null,
       'Vadi Mahallesi 97058 Sokak No:91 Onikişubat / Kahramanmaraş', '0537 322 26 46', 'taktikalp46@gmail.com', null, null, null
from public.stores s
where s.slug = 'taktikalp46'
on conflict (store_id) do nothing;

-- 2) Yasal metinler (sürümlü) ----------------------------------------------------
create table if not exists public.store_legal_documents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  kind text not null check (kind in ('distance_sales', 'pre_information', 'returns', 'privacy_kvkk', 'cookies', 'withdrawal_form')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null check (char_length(body) between 1 and 100000),
  version integer not null check (version >= 1),
  status text not null default 'published' check (status in ('published')),
  reviewed_by_lawyer boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint store_legal_documents_version_unique unique (store_id, kind, version),
  constraint store_legal_documents_id_store_unique unique (id, store_id)
);

comment on table public.store_legal_documents is
  'Faz 33 — mağaza başına yasal metin sürümleri. Her yayımlama yeni satır (version artar); eski sürümler kalır. Yayımlanmış satırda yalnız reviewed_* alanları değişebilir (trigger). Vitrin store_public_legal_documents view''ından son sürümü okur.';

create index if not exists store_legal_documents_store_kind_idx
  on public.store_legal_documents (store_id, kind, version desc);

create or replace function public.store_legal_documents_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.store_id is distinct from old.store_id
     or new.kind is distinct from old.kind
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.version is distinct from old.version
     or new.status is distinct from old.status
     or new.created_at is distinct from old.created_at then
    raise exception 'Yayımlanmış yasal metin sürümü değiştirilemez; yeni sürüm yayımlayın.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger store_legal_documents_guard_update
  before update on public.store_legal_documents
  for each row execute function public.store_legal_documents_guard_update();

alter table public.store_legal_documents enable row level security;

create policy store_legal_documents_select_editor_tier on public.store_legal_documents
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy store_legal_documents_insert_admin_tier on public.store_legal_documents
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_legal_documents_update_admin_tier on public.store_legal_documents
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

-- Vitrin: yayındaki mağazanın her türden SON sürümü (taban tabloda anon policy yok).
create or replace view public.store_public_legal_documents
  with (security_invoker = false)
  as
  select distinct on (d.store_id, d.kind)
    d.id, d.store_id, d.kind, d.title, d.body, d.version, d.created_at
  from public.store_legal_documents d
  join public.stores s on s.id = d.store_id
  where s.status = 'active' and d.status = 'published'
  order by d.store_id, d.kind, d.version desc;

comment on view public.store_public_legal_documents is
  'Faz 33 — vitrin: aktif mağazaların her yasal metin türünün yalnız SON yayımlanmış sürümü. reviewed_* ve updated_by gibi iç alanlar yok.';

grant select on public.store_public_legal_documents to anon, authenticated;

-- 3) Siparişte sözleşme kaydı ----------------------------------------------------
create table if not exists public.order_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  pre_information_document_id uuid not null,
  distance_sales_document_id uuid not null,
  pre_information_version integer not null,
  distance_sales_version integer not null,
  pre_information_snapshot text not null,
  distance_sales_snapshot text not null,
  accepted_at timestamptz not null default now(),
  marketing_consent boolean not null default false,
  marketing_consent_text text,
  created_at timestamptz not null default now(),
  constraint order_legal_acceptances_order_unique unique (order_id),
  constraint order_legal_acceptances_pre_info_fkey
    foreign key (pre_information_document_id, store_id) references public.store_legal_documents (id, store_id),
  constraint order_legal_acceptances_distance_sales_fkey
    foreign key (distance_sales_document_id, store_id) references public.store_legal_documents (id, store_id)
);

comment on table public.order_legal_acceptances is
  'Faz 33 — siparişte kabul edilen ön bilgilendirme + mesafeli satış sözleşmesi (sürüm id + doldurulmuş metnin anlık görüntüsü) ve ayrı, opsiyonel ticari elektronik ileti onayı. Yazma yalnız service-role; okuma editor+.';

create index if not exists order_legal_acceptances_store_id_idx on public.order_legal_acceptances (store_id);

alter table public.order_legal_acceptances enable row level security;

create policy order_legal_acceptances_select_editor_tier on public.order_legal_acceptances
  for select to authenticated using ((select public.is_store_editor_member(store_id)));

revoke insert, update, delete on public.order_legal_acceptances from anon, authenticated;

-- Doğrulama (beklenen: 3 tablo / 1 view / Taktikalp46 satıcı satırı 1 / policy sayıları 4, 3, 1):
-- select
--   (select count(*) from information_schema.tables where table_schema = 'public'
--      and table_name in ('store_seller_profiles', 'store_legal_documents', 'order_legal_acceptances')) as tables,
--   (select count(*) from information_schema.views where table_schema = 'public' and table_name = 'store_public_legal_documents') as views,
--   (select count(*) from public.store_seller_profiles sp join public.stores s on s.id = sp.store_id where s.slug = 'taktikalp46') as seller_rows,
--   (select count(*) from pg_policies where tablename = 'store_seller_profiles') as seller_policies,
--   (select count(*) from pg_policies where tablename = 'store_legal_documents') as document_policies,
--   (select count(*) from pg_policies where tablename = 'order_legal_acceptances') as acceptance_policies;
