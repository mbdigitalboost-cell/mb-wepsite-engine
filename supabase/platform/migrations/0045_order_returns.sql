-- =============================================================================
-- 0045 — Faz 30: İptal & İade (cayma) sistemi + satış raporu temeli
-- Platform projesi: wnedgbbyqpvylfiwkwen. Supabase SQL Editor'den çalıştırın.
--
-- Yasal çerçeve (Mesafeli Sözleşmeler Yönetmeliği — Cowork özeti, hukuki
-- danışmanınıza teyit ettirin): cayma süresi en az 14 gün ve TESLİMDEN
-- başlar; iade masrafı satıcının anlaşmalı taşıyıcısında tüketiciye
-- yüklenemez; ödeme, malın taşıyıcıya teslim edildiği tarihten itibaren 14
-- gün içinde iade edilir. Bu yüzden:
--   * iade süresi mağaza ayarı, CHECK >= 14;
--   * orders.delivered_at — teslim tarihi bilinmiyorsa talep ENGELLENMEZ;
--   * order_returns.handed_to_carrier_at — 14 günlük ödeme sayacı.
--
-- İzolasyon (Faz 28/29): her tablo store_id taşır, bağlar bileşik FK
-- (id, store_id). Talep OLUŞTURMA yalnız sunucuda (service-role), sipariş
-- sahipliği doğrulandıktan sonra; IBAN ayrı tabloda, hiçbir RLS policy'si
-- yok (Faz 21/22 entegrasyon tabloları deseni).
-- =============================================================================

-- 1) orders: teslim tarihi + test siparişi işareti -----------------------------
alter table public.orders
  add column if not exists delivered_at timestamptz,
  add column if not exists is_test boolean not null default false;

comment on column public.orders.delivered_at is
  'Faz 30 — teslim tarihi (cayma süresi buradan başlar). Sipariş completed''a İLK geçtiğinde trigger doldurur: Basit Kargo webhook''u DELIVERED → completed (gerçek teslim) ya da admin elle "Tamamlandı". Faz 30 öncesi tamamlanmış siparişlerde NULL kalır (gerçek tarih bilinmiyor; talep engellenmez).';
comment on column public.orders.is_test is
  'Faz 30 — admin işaretler; satış raporundan hariç tutulur.';

create or replace function public.orders_set_delivered_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'completed' and new.delivered_at is null
     and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.delivered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_delivered_at on public.orders;
create trigger orders_set_delivered_at
  before insert or update of status on public.orders
  for each row execute function public.orders_set_delivered_at();

-- 2) payment_status: kısmi iade ---------------------------------------------------
-- Kısmi iadede sipariş "ödendi" ile "iade edildi" arasında: ayrı değer, raporda
-- ve listede doğrudan görünür. (Enum'a değer eklemek geri alınamaz; aynı
-- transaction'da bu değer KULLANILMIYOR.)
alter type public.payment_status add value if not exists 'partially_refunded';

-- 3) Kişiye özel — cayma dışı bayrakları ----------------------------------------
alter table public.products
  add column if not exists is_personalized_non_returnable boolean not null default false;
alter table public.product_addons
  add column if not exists is_personalized_non_returnable boolean not null default false;

comment on column public.products.is_personalized_non_returnable is
  'Faz 30 — tüketicinin isteğiyle kişiye özel hazırlanan mal (MSY m.15/1-b) — admin işaretler, varsayılan kapalı. Otomatik karar verilmez; hukuki danışmana teyit ettirilmeli.';
comment on column public.product_addons.is_personalized_non_returnable is
  'Faz 30 — bu ek ürün seçilen sipariş kalemi kişiye özel sayılır (ör. kılıf üstü yazı). Varsayılan kapalı.';

-- 4) Mağaza iade ayarları -----------------------------------------------------------
create table if not exists public.store_return_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  returns_enabled boolean not null default false,
  return_window_days integer not null default 14 check (return_window_days >= 14 and return_window_days <= 365),
  return_carrier_name text check (return_carrier_name is null or char_length(return_carrier_name) <= 120),
  return_code text check (return_code is null or char_length(return_code) <= 120),
  return_instructions text check (return_instructions is null or char_length(return_instructions) <= 4000),
  return_address text check (return_address is null or char_length(return_address) <= 1000),
  updated_at timestamptz not null default now()
);

comment on table public.store_return_settings is
  'Faz 30 — mağaza başına iptal/iade ayarları. returns_enabled varsayılan KAPALI: admin kargo/kod/talimatı girip açınca vitrinde iptal/iade butonları görünür. İade süresi en az 14 gün (yasal alt sınır).';

create trigger set_store_return_settings_updated_at
  before update on public.store_return_settings
  for each row execute function public.set_updated_at();

alter table public.store_return_settings enable row level security;

create policy store_return_settings_select_editor_tier on public.store_return_settings
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy store_return_settings_insert_admin_tier on public.store_return_settings
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_return_settings_update_admin_tier on public.store_return_settings
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

-- 5) İptal / iade talepleri ------------------------------------------------------------
create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_id uuid not null,
  return_number bigint generated always as identity,
  kind text not null check (kind in ('cancel', 'return')),
  status text not null default 'requested' check (
    status in ('requested', 'approved', 'received', 'refunded', 'closed', 'rejected', 'cancelled_by_customer')
  ),
  reason text not null check (reason in ('changed_mind', 'damaged', 'wrong_item', 'not_fit', 'other')),
  customer_note text check (customer_note is null or char_length(customer_note) <= 1000),
  channel text not null check (channel in ('member', 'guest')),
  refund_method text check (refund_method is null or refund_method in ('iyzico', 'iban', 'none')),
  refund_amount numeric(12, 2) not null default 0 check (refund_amount >= 0),
  refund_reference text check (refund_reference is null or char_length(refund_reference) <= 200),
  refunded_at timestamptz,
  return_code text check (return_code is null or char_length(return_code) <= 120),
  return_carrier_name text check (return_carrier_name is null or char_length(return_carrier_name) <= 120),
  return_instructions_snapshot text check (return_instructions_snapshot is null or char_length(return_instructions_snapshot) <= 4000),
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  restock boolean not null default true,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  handed_to_carrier_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_returns_id_store_id_unique unique (id, store_id),
  constraint order_returns_return_number_unique unique (return_number),
  constraint order_returns_order_store_fkey
    foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade,
  constraint order_returns_rejection_reason_required
    check (status <> 'rejected' or (rejection_reason is not null and char_length(btrim(rejection_reason)) > 0))
);

comment on table public.order_returns is
  'Faz 30 — iptal (kind=cancel, kargodan önce) ve iade/cayma (kind=return) talepleri. Oluşturma YALNIZ sunucuda (service-role) sipariş sahipliği doğrulandıktan sonra (üye: customer_user_id; misafir: sipariş no + telefon + kısa ömürlü imzalı jeton). Durum geçişleri lib/commerce/returns/state.ts''te tek yerden. refund_amount sunucuda hesaplanır (istemciden gelmez). Bir siparişte aynı anda tek açık talep (order_returns_one_open_per_order).';

create index if not exists order_returns_store_status_idx on public.order_returns (store_id, status, requested_at desc);
create index if not exists order_returns_order_idx on public.order_returns (order_id);
create unique index if not exists order_returns_one_open_per_order
  on public.order_returns (order_id) where status in ('requested', 'approved', 'received');

create trigger set_order_returns_updated_at
  before update on public.order_returns
  for each row execute function public.set_updated_at();

alter table public.order_returns enable row level security;

create policy order_returns_select_editor_tier on public.order_returns
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy order_returns_select_own_customer on public.order_returns
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_returns.order_id and o.store_id = order_returns.store_id
        and o.customer_user_id = (select auth.uid())
    )
  );
create policy order_returns_update_editor_tier on public.order_returns
  for update to authenticated
  using ((select public.is_store_editor_member(store_id)))
  with check ((select public.is_store_editor_member(store_id)));
-- INSERT/DELETE policy YOK: oluşturma service-role ile, silme hiç (kalıcı kayıt).

-- 6) Talep kalemleri (kalem bazında kısmi iade) ----------------------------------------
create table if not exists public.order_return_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  return_id uuid not null,
  order_item_id uuid not null,
  quantity integer not null check (quantity > 0),
  refund_amount numeric(12, 2) not null default 0 check (refund_amount >= 0),
  created_at timestamptz not null default now(),
  constraint order_return_items_unique_line unique (return_id, order_item_id),
  constraint order_return_items_return_store_fkey
    foreign key (return_id, store_id) references public.order_returns (id, store_id) on delete cascade,
  constraint order_return_items_item_store_fkey
    foreign key (order_item_id, store_id) references public.order_items (id, store_id) on delete cascade
);

comment on table public.order_return_items is
  'Faz 30 — talep edilen kalem ve adet. quantity ≤ satın alınan − daha önce iade edilen (sunucu kontrol eder). refund_amount: kalemin indirim payı düşülmüş iade tutarı, sunucuda hesaplanır.';

create index if not exists order_return_items_return_idx on public.order_return_items (return_id);
create index if not exists order_return_items_order_item_idx on public.order_return_items (order_item_id);

alter table public.order_return_items enable row level security;

create policy order_return_items_select_editor_tier on public.order_return_items
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy order_return_items_select_own_customer on public.order_return_items
  for select to authenticated using (
    exists (
      select 1 from public.order_returns r
      join public.orders o on o.id = r.order_id and o.store_id = r.store_id
      where r.id = order_return_items.return_id and r.store_id = order_return_items.store_id
        and o.customer_user_id = (select auth.uid())
    )
  );

-- 7) IBAN — yalnız service-role ----------------------------------------------------------
create table if not exists public.order_return_bank_details (
  return_id uuid primary key,
  store_id uuid not null references public.stores (id) on delete cascade,
  account_holder text not null check (char_length(account_holder) between 3 and 140),
  iban text not null check (iban ~ '^TR[0-9]{24}$'),
  created_at timestamptz not null default now(),
  constraint order_return_bank_details_return_store_fkey
    foreign key (return_id, store_id) references public.order_returns (id, store_id) on delete cascade
);

comment on table public.order_return_bank_details is
  'Faz 30 — kapıda ödeme/havale iadesi için müşterinin IBAN''ı (kişisel veri). Hiçbir RLS policy yok, anon/authenticated revoke edildi; yalnız service-role (lib/commerce/returns/bank-details.ts). Admin''de maskeli; tam değer "Göster" ile ve audit kaydıyla (değerin kendisi log''a yazılmaz). İade tamamlandıktan sonra silinebilir (otomatik silme yok — rapora bakın).';

alter table public.order_return_bank_details enable row level security;
revoke all on table public.order_return_bank_details from anon, authenticated;

-- 8) Satış raporu: siparişlerin satır toplamları (RLS geçerli) -----------------------------
-- SECURITY INVOKER: çağıranın RLS'i uygulanır (yalnız üyesi olduğu mağaza).
create or replace function public.store_sales_report_orders(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  order_id uuid,
  order_number bigint,
  created_at timestamptz,
  status public.order_status,
  payment_status public.payment_status,
  payment_method text,
  subtotal numeric,
  discount_amount numeric,
  item_quantity bigint,
  refunded_amount numeric,
  customer_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    o.id, o.order_number, o.created_at, o.status, o.payment_status, o.payment_method,
    o.subtotal, o.discount_amount,
    coalesce((select sum(oi.quantity) from public.order_items oi where oi.order_id = o.id and oi.store_id = o.store_id), 0)::bigint,
    coalesce((select sum(r.refund_amount) from public.order_returns r
              where r.order_id = o.id and r.store_id = o.store_id and r.status = 'refunded'), 0),
    o.customer_name
  from public.orders o
  where o.store_id = p_store_id
    and o.is_test = false
    and o.created_at >= p_from
    and o.created_at < p_to
  order by o.created_at;
$$;

revoke all on function public.store_sales_report_orders(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.store_sales_report_orders(uuid, timestamptz, timestamptz) to authenticated;

-- Kontrol
select
  (select count(*) from information_schema.columns where table_name = 'orders' and column_name in ('delivered_at', 'is_test')) as orders_new_cols,
  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('order_returns', 'order_return_items', 'order_return_bank_details', 'store_return_settings')) as new_tables,
  (select count(*) from pg_policies where tablename in ('order_returns', 'order_return_items', 'order_return_bank_details', 'store_return_settings')) as policies;
-- Beklenen: orders_new_cols = 2, new_tables = 4, policies = 8 (bank_details: 0).
