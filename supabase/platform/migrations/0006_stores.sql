-- =============================================================================
-- PLATFORM MIGRATION 0006
-- stores — foundation table for the Commerce Platform vision
--
-- PHASE 1 (Commerce Platform genişlemesi), work item F/G. Bu migration
-- SADECE bir temel atıyor — ürün/sipariş/ödeme/kargo tabloları YOK, bu
-- fazın kapsamı dışında (kullanıcının açık talimatı: "ürün, sipariş,
-- ödeme, kargo modüllerini henüz kurma").
--
-- NEDEN `websites`'TEN AYRI BİR TABLO (dürüstlükle belirtilmeli — bu iki
-- tablo bugün neredeyse aynı sütunları taşıyor): `websites` bir
-- müşterinin CMS/marketing sitesini temsil ediyor (Petra'nın tanıtım
-- sitesi gibi). `stores` ise ileride ürün/sipariş/envanter gibi
-- e-ticarete özgü tabloların FK ile bağlanacağı, kavramsal olarak AYRI
-- bir varlık — bir müşterinin marketing sitesi olup e-ticaret mağazası
-- olmayabilir (bugünkü Petra durumu tam olarak bu), ya da ileride
-- birden fazla mağazası olabilir. Bugün Petra için ikisi aynı gerçek
-- işi temsil ediyor ve kasıtlı olarak İKİ AYRI SATIR olarak var olacak
-- (bkz. aşağıdaki seed) — bu bir kod tekrarı değil, iki farklı büyüme
-- yönünün (marketing-site sayısı vs. e-ticaret-mağazası sayısı) şimdiden
-- ayrılması.
--
-- `supabase_connection_key` burada NULLABLE — bir mağazanın ürün/sipariş
-- verisi nerede yaşayacağı (kendi müşteri projesinde mi, yoksa Taktikalp46
-- gibi yeni bir müşteri için Platform projesinin kendisinde mi) henüz
-- kararlaştırılmadı; bu migration o kararı zorlamıyor, sadece alanı
-- hazır tutuyor. Petra'nın satırı gerçek "PETRA" anahtarıyla dolduruluyor
-- çünkü bu ZATEN doğrulanmış, gerçek bir değer (bkz. websites tablosu).
--
-- Bu migration KESİNLİKLE Taktikalp46 için yeni bir Supabase projesi
-- AÇMIYOR — kullanıcının açık talimatı. Sadece Platform DB'de bir satır.
-- =============================================================================

create type public.store_status as enum ('active', 'inactive');

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  slug text not null,
  status public.store_status not null default 'active',
  -- Hangi Supabase projesinin bu mağazanın e-ticaret verisini
  -- (ileride: products/orders/...) tutacağını işaret eder. NULL =
  -- henüz bir e-ticaret backend'i bağlanmadı (bugünkü Petra durumu —
  -- mağaza kaydı var, ürün/sipariş sistemi yok).
  supabase_connection_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_unique unique (slug),
  constraint stores_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint stores_connection_key_format check (
    supabase_connection_key is null or supabase_connection_key ~ '^[A-Z0-9_]+$'
  )
);

comment on table public.stores is
  'Phase 1 foundation for the Commerce Platform: one row per customer store (conceptually separate from websites — see migration file header). No product/order/payment tables yet; those will FK to stores.id in a later phase.';

create trigger set_stores_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

create index stores_customer_id_idx on public.stores (customer_id);
create index stores_status_idx on public.stores (status);

alter table public.stores enable row level security;

-- Aynı desen: customers/websites (migration 0004) ile birebir aynı
-- erişim şekli. is_customer_member() zaten migration 0005'te store-
-- eşdeğeri rolleri tanıyor, burada hiçbir yeni fonksiyon gerekmiyor.
create policy stores_select_member_or_admin
  on public.stores for select
  using (public.is_customer_member(customer_id));

create policy stores_insert_admin_only
  on public.stores for insert
  with check (public.is_platform_admin());

create policy stores_update_admin_only
  on public.stores for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy stores_delete_admin_only
  on public.stores for delete
  using (public.is_platform_admin());

-- Seed: TEK gerçek satır, Petra için. Uydurma bir "ikinci test mağazası"
-- YOK — bu migration'ın kapsamı bugün gerçekten var olan tek müşteriyi
-- kaydetmek. customer_id + supabase_connection_key, 2026-08-22'de
-- doğrudan Platform DB'den doğrulanan gerçek değerler (bkz. Phase 1
-- raporu): customers.id = '55bf2f5c-5ac9-4d9e-9e9a-8b8f153ee81d',
-- websites.supabase_connection_key = 'PETRA'.
insert into public.stores (customer_id, name, slug, status, supabase_connection_key)
values (
  '55bf2f5c-5ac9-4d9e-9e9a-8b8f153ee81d',
  'Petra Mühendislik',
  'petra-muhendislik',
  'active',
  'PETRA'
);
