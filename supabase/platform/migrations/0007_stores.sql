-- =============================================================================
-- PLATFORM MIGRATION 0007
-- stores — foundation table for the Commerce Platform vision
--
-- (Numaralandırma notu: bu dosya önceki bir taslakta 0006, ondan önceki
-- bir planda 0009 olarak geçmişti — ikisi de bayattı. Gerçek kaynak
-- mevcut migration klasörü + canlı `supabase_migrations.schema_migrations`
-- tablosu: platformda şu an tam olarak 4 migration commit edilmiş
-- (0001-0004), bu yüzden sıradaki 3 dosya 0005/0006/0007. Bu dosya
-- 0005/0006'ya (RBAC genişlemesi) BAĞIMLI DEĞİL — customer_users'a hiç
-- dokunmuyor, sadece is_customer_member()'ı çağırıyor — ama üç dosya da
-- sırayla, aynı PR/onay içinde uygulanacağı için 0007 numarası verildi.)
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
-- GÜVENLİK — `supabase_connection_key` NEDEN SECRET DEĞİL: bu sütun
-- yalnızca bir ETİKET (ör. "PETRA") — gerçek Supabase URL/anon
-- key/service-role key hiçbir zaman bu tabloda (ya da `websites`'ta)
-- saklanmıyor, sadece Vercel ortam değişkenlerinde
-- (SUPABASE_URL_<KEY>/SUPABASE_SERVICE_ROLE_KEY_<KEY>) yaşıyor ve
-- yalnızca `lib/cms/connection.ts` server-side kodundan okunuyor (bkz. o
-- dosyanın yorumu, migration 0001'in `websites` tablosu için de aynı
-- notu içerir). Bu etiketin kendisi RLS ile `stores_select_member_or_admin`
-- politikası altında o müşterinin kendi kullanıcılarına GÖRÜNÜR olacak
-- (tıpkı bugün `websites.supabase_connection_key`'in zaten
-- `websites_select_member_or_admin` altında görünür olduğu gibi — bu
-- YENİ bir açık değil, mevcut, kasıtlı desenin aynen devamı) — ama bu
-- zararsız, çünkü etiketin kendisini bilmek gerçek bir kimlik bilgisi
-- vermiyor. Client'a hiçbir zaman DOĞRUDAN service-role/anon key
-- gönderilmiyor; bu tablo yalnızca "hangi anahtar" sorusuna cevap
-- veriyor, "o anahtarın değeri ne" sorusuna değil.
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
  -- mağaza kaydı var, ürün/sipariş sistemi yok). Yalnızca bir ETİKET —
  -- bkz. dosya başındaki güvenlik notu.
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
-- erişim şekli. is_customer_member() zaten migration 0006'da store-
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
-- kaydetmek. customer_id + supabase_connection_key, bu oturumda
-- doğrudan Platform DB'den (canlı `customers`/`websites` sorgularıyla,
-- iki kez) doğrulanan gerçek değerler: customers.id =
-- '55bf2f5c-5ac9-4d9e-9e9a-8b8f153ee81d' (name: "Petra Mühendislik",
-- slug: "petra-muhendislik", status: active),
-- websites.supabase_connection_key = 'PETRA' (status: active).
insert into public.stores (customer_id, name, slug, status, supabase_connection_key)
values (
  '55bf2f5c-5ac9-4d9e-9e9a-8b8f153ee81d',
  'Petra Mühendislik',
  'petra-muhendislik',
  'active',
  'PETRA'
);
