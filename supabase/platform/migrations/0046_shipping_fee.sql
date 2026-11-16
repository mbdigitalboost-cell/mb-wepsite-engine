-- =============================================================================
-- 0046 — Faz 31: Kargo ücreti ve kapıda ödeme ücreti
-- Platform projesi: wnedgbbyqpvylfiwkwen. Supabase SQL Editor'den çalıştırın.
--
-- Kural (kullanıcı, 2026-11-16): ürün tutarı ücretsiz kargo sınırının
-- altındaysa kargo ücreti alınır. Sınır varsayılan olarak İNDİRİM ÖNCESİ ürün
-- tutarına bakar ("2.100 TL alışverişte indirime bakılmaz, kargo ücretsiz;
-- 1.900 TL'de 250 TL kargo"). Kapıda ödeme ek ücreti varsayılan 0.
--
-- Neden yeni tablo: store_shipping_integrations SIR tutar (API anahtarı,
-- hiçbir policy yok); kargo ücreti ise vitrinde (sepet, duyuru şeridi, ürün
-- sayfası) herkesin göreceği bir bilgi → ayrı, herkese okunabilir tablo.
--
-- Geçmiş siparişler DEĞİŞMEZ: orders.shipping_fee / cod_fee varsayılan 0.
-- Sipariş toplamı kolonu EKLENMEDİ: toplam tek yerde hesaplanır
-- (lib/commerce/shipping-fee.ts orderGrandTotal = ürünler − indirim + kargo
-- + kapıda ödeme ücreti); ikinci bir kopya kayıt tutarsızlığa yol açardı.
-- =============================================================================

-- 1) Mağaza kargo ücreti ayarı ------------------------------------------------
create table if not exists public.store_shipping_fee_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  shipping_fee numeric(12, 2) not null default 250 check (shipping_fee >= 0),
  -- NULL = hiçbir tutarda ücretsiz kargo yok.
  free_shipping_threshold numeric(12, 2) default 2000 check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  threshold_basis text not null default 'before_discount' check (threshold_basis in ('before_discount', 'after_discount')),
  cod_fee numeric(12, 2) not null default 0 check (cod_fee >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.store_shipping_fee_settings is
  'Faz 31 — mağaza başına kargo ücreti, ücretsiz kargo sınırı (NULL = yok), sınırın neye göre hesaplandığı (indirim öncesi/sonrası ürün tutarı) ve kapıda ödeme ek ücreti. Vitrin okur (yayında mağaza), editor+ okur, store_admin+ yazar. Satır yoksa uygulama ücret ALMAZ ve "ücretsiz kargo" iddiası göstermez.';

create trigger set_store_shipping_fee_settings_updated_at
  before update on public.store_shipping_fee_settings
  for each row execute function public.set_updated_at();

alter table public.store_shipping_fee_settings enable row level security;

create policy store_shipping_fee_settings_select_public on public.store_shipping_fee_settings
  for select to anon, authenticated using ((select public.is_store_publicly_visible(store_id)));
create policy store_shipping_fee_settings_select_editor_tier on public.store_shipping_fee_settings
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy store_shipping_fee_settings_insert_admin_tier on public.store_shipping_fee_settings
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_shipping_fee_settings_update_admin_tier on public.store_shipping_fee_settings
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

-- Taktikalp46: 250 TL kargo, 2.000 TL ve üzeri (indirim öncesi) ücretsiz, kapıda ödeme ek ücreti 0.
insert into public.store_shipping_fee_settings (store_id, shipping_fee, free_shipping_threshold, threshold_basis, cod_fee)
select s.id, 250, 2000, 'before_discount', 0
from public.stores s
where s.slug = 'taktikalp46'
on conflict (store_id) do nothing;

-- 2) Sipariş anı anlık görüntüsü -----------------------------------------------
alter table public.orders
  add column if not exists shipping_fee numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  add column if not exists cod_fee numeric(12, 2) not null default 0 check (cod_fee >= 0);

comment on column public.orders.shipping_fee is
  'Faz 31 — sipariş anında alınan kargo ücreti (sunucuda hesaplanır; istemciye güvenilmez). Faz 31 öncesi siparişlerde 0.';
comment on column public.orders.cod_fee is
  'Faz 31 — sipariş anında alınan kapıda ödeme ek ücreti (yalnız Kapıda Nakit/Kapıda Kart). Faz 31 öncesi siparişlerde 0.';

-- 3) Satış raporu RPC'sine kargo ve kapıda ödeme ücreti -----------------------------
-- Dönüş tipi değiştiği için önce silinip yeniden oluşturulur (aynı imza, aynı yetki).
drop function if exists public.store_sales_report_orders(uuid, timestamptz, timestamptz);

create function public.store_sales_report_orders(
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
  customer_name text,
  shipping_fee numeric,
  cod_fee numeric
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
    o.customer_name,
    o.shipping_fee,
    o.cod_fee
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
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name in ('shipping_fee', 'cod_fee')) as orders_new_cols,
  (select count(*) from pg_policies where tablename = 'store_shipping_fee_settings') as policies,
  (select count(*) from public.store_shipping_fee_settings) as settings_rows,
  (pg_get_function_result('public.store_sales_report_orders(uuid, timestamptz, timestamptz)'::regprocedure) like '%shipping_fee%cod_fee%') as rpc_has_fees;
-- Beklenen: orders_new_cols = 2, policies = 4, settings_rows = 1, rpc_has_fees = true.
