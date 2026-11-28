-- Faz 40 — sipariş e-postaları: mağaza başına e-posta ayarı + gönderim kaydı.
--
-- NEDEN: bugüne kadar bütün mağaza e-postaları ortamdaki TEK gönderen adresle
-- (RESEND_FROM_EMAIL) gidiyordu; ikinci bir mağaza, ilk mağazanın adresinden
-- e-posta gönderirdi (SITE_IZOLASYON.md §2.8). Bu migration göndereni mağaza
-- başına ayara taşır ve her gönderimi kaydeder.
--
-- KURAL (kod tarafı): mağazanın store_email_settings satırı yoksa e-posta
-- GÖNDERİLMEZ. Ortam adresine ya da başka mağazanın adresine düşmek yoktur.
-- Bu migration HİÇBİR mağaza için satır eklemez (mağazaya özel tohum: 0055).
--
-- UYGULAMA SIRASI: önce 0054, sonra 0055; ikisi de kod yayınlanmadan ÖNCE.
--
-- GERİ ALMA: drop table public.order_email_log; drop table public.store_email_settings;

-- ---------------------------------------------------------------------------
-- 1) Mağaza başına e-posta ayarı
-- ---------------------------------------------------------------------------
create table if not exists public.store_email_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  -- Alıcının gördüğü gönderen adı ve adresi. Adresin alan adı e-posta
  -- sağlayıcısında (Resend) doğrulanmış olmalıdır; aksi hâlde gönderim reddedilir.
  from_name text not null,
  from_email text not null,
  -- Boşsa yanıtlar gönderen adrese gider.
  reply_to_email text,
  -- "Yeni sipariş" bildiriminin gideceği mağaza adresleri (en fazla 5).
  order_notification_emails text[] not null default '{}',
  -- Tür anahtarları.
  send_order_confirmation boolean not null default true,
  send_shipped boolean not null default true,
  send_cancel_refund boolean not null default true,
  send_store_new_order boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_email_settings_from_name_length check (char_length(btrim(from_name)) between 1 and 100),
  constraint store_email_settings_from_name_chars check (from_name !~ '[<>"\r\n]'),
  constraint store_email_settings_from_email_format check (from_email ~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$' and char_length(from_email) <= 255),
  constraint store_email_settings_reply_to_format check (
    reply_to_email is null or (reply_to_email ~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$' and char_length(reply_to_email) <= 255)
  ),
  constraint store_email_settings_notification_count check (cardinality(order_notification_emails) <= 5),
  constraint store_email_settings_notification_length check (char_length(array_to_string(order_notification_emails, ',')) <= 1300)
);

comment on table public.store_email_settings is
  'Faz 40 — mağaza başına e-posta göndereni, bildirim adresleri ve tür anahtarları. Satır yoksa o mağaza adına e-posta gönderilmez. Vitrin (anon) erişimi yok; editor+ okur, store_admin+ yazar.';

create trigger set_store_email_settings_updated_at
  before update on public.store_email_settings
  for each row execute function public.set_updated_at();

alter table public.store_email_settings enable row level security;
revoke all on table public.store_email_settings from anon;

create policy store_email_settings_select_editor_tier on public.store_email_settings
  for select to authenticated using ((select public.is_store_editor_member(store_id)));
create policy store_email_settings_insert_admin_tier on public.store_email_settings
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_email_settings_update_admin_tier on public.store_email_settings
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));

-- ---------------------------------------------------------------------------
-- 2) Gönderim kaydı
-- ---------------------------------------------------------------------------
-- İÇERİK YAZILMAZ: e-posta gövdesi, IBAN, kart bilgisi, token burada tutulmaz.
-- Yalnız tür, alıcı adresi, sağlayıcının mesaj kimliği, durum ve kısa hata.
create table if not exists public.order_email_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  -- Test e-postasında (kind = 'test') sipariş yoktur.
  order_id uuid,
  -- İade/iptal talebi e-postalarında talebin kimliği (bir siparişte birden çok talep olabilir).
  return_id uuid,
  kind text not null,
  recipient text not null,
  provider_message_id text,
  status text not null,
  error text,
  -- Kaç kez denendi (ilk gönderim 1; "Tekrar gönder" artırır).
  attempts integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_email_log_order_store_fkey
    foreign key (order_id, store_id) references public.orders (id, store_id) on delete cascade,
  constraint order_email_log_return_store_fkey
    foreign key (return_id, store_id) references public.order_returns (id, store_id) on delete cascade,
  constraint order_email_log_kind_check check (
    kind in (
      'order_confirmation', 'store_new_order', 'shipped', 'cancelled',
      'return_requested', 'return_approved', 'return_rejected', 'refund_completed',
      'test'
    )
  ),
  constraint order_email_log_status_check check (status in ('sent', 'failed', 'skipped')),
  constraint order_email_log_order_required check (kind = 'test' or order_id is not null),
  constraint order_email_log_return_required check (
    (kind in ('return_requested', 'return_approved', 'return_rejected', 'refund_completed')) = (return_id is not null)
  ),
  constraint order_email_log_recipient_length check (char_length(recipient) <= 1300),
  constraint order_email_log_error_length check (error is null or char_length(error) <= 500),
  constraint order_email_log_attempts_positive check (attempts >= 1)
);

comment on table public.order_email_log is
  'Faz 40 — gönderilen/gönderilemeyen/atlanan sipariş e-postalarının kaydı. İçerik tutulmaz. Yalnız service-role yazar; editor+ kendi mağazasınınkini okur.';

-- TEKRAR KORUMASI: tek seferlik türlerde bir sipariş için tek kayıt; talep
-- e-postalarında bir talep için tür başına tek kayıt.
create unique index if not exists order_email_log_order_kind_unique
  on public.order_email_log (order_id, kind)
  where kind in ('order_confirmation', 'store_new_order', 'shipped', 'cancelled');
create unique index if not exists order_email_log_return_kind_unique
  on public.order_email_log (return_id, kind)
  where return_id is not null;

create index if not exists order_email_log_store_created_idx on public.order_email_log (store_id, created_at desc);
create index if not exists order_email_log_order_idx on public.order_email_log (order_id);

create trigger set_order_email_log_updated_at
  before update on public.order_email_log
  for each row execute function public.set_updated_at();

alter table public.order_email_log enable row level security;
revoke all on table public.order_email_log from anon;
revoke insert, update, delete on table public.order_email_log from authenticated;

-- Yazma politikası YOK: yalnız service-role (RLS'i aşar) yazar.
create policy order_email_log_select_editor_tier on public.order_email_log
  for select to authenticated using ((select public.is_store_editor_member(store_id)));

-- Doğrulama (salt-okunur, uyguladıktan sonra):
--   select count(*) from public.store_email_settings;   -- 0 (0055'ten önce)
--   select count(*) from public.order_email_log;        -- 0
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('store_email_settings', 'order_email_log') order by 1, 2;   -- 3 + 1 satır
--   select indexname from pg_indexes where tablename = 'order_email_log' order by 1; -- pkey + 4 index
