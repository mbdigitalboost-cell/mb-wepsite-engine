-- Faz 40 (ek) — mağazanın Havale/EFT bilgileri (hesap sahibi, banka, IBAN).
--
-- NEDEN: ödeme formunda "Havale-EFT" seçeneği var ve "IBAN bilgisi sipariş
-- sonrası gösterilir" deniyordu; ama sistemde mağazanın IBAN'ı hiçbir yerde
-- tutulmuyordu, yani sipariş sonrası gösterilecek bir şey yoktu.
--
-- KURAL: uydurma/varsayılan IBAN yok. Bu migration HİÇBİR mağaza için satır
-- eklemez; bilgiyi mağaza yöneticisi panelden (Mağaza → Ödeme) kendisi girer.
-- Satır yoksa IBAN bölümü hiçbir yerde gösterilmez ve ödeme formundaki
-- "IBAN bilgisi sipariş sonrası gösterilir" metni de gizlenir.
--
-- ERİŞİM: vitrin (anon) ve mağaza müşterisi bu tabloyu OKUYAMAZ. Değer
-- müşteriye yalnız sunucu tarafında, service-role ile, KENDİ Havale
-- siparişinin mağazasına ait olarak (sipariş sonrası ekran, Siparişlerim
-- detayı, sipariş onayı e-postası) verilir. Panelde yalnız store_admin+
-- okur/yazar/siler. IBAN log'a ve denetim kaydına yazılmaz (denetimde yalnız
-- son 4 hane).
--
-- GERİ ALMA: drop table public.store_bank_transfer_details;

create table if not exists public.store_bank_transfer_details (
  store_id uuid primary key references public.stores (id) on delete cascade,
  account_holder text not null,
  bank_name text not null,
  -- Boşluksuz, büyük harf: TR + 24 rakam. Kontrol hanesi (mod 97) uygulamada doğrulanır.
  iban text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_bank_transfer_details_holder_length check (char_length(btrim(account_holder)) between 1 and 150),
  constraint store_bank_transfer_details_bank_length check (char_length(btrim(bank_name)) between 1 and 100),
  constraint store_bank_transfer_details_iban_format check (iban ~ '^TR[0-9]{24}$')
);

comment on table public.store_bank_transfer_details is
  'Faz 40 — mağazanın Havale/EFT bilgileri. Satır yoksa IBAN hiçbir yerde gösterilmez. Vitrin erişimi yok; müşteriye yalnız sunucu tarafında kendi Havale siparişi için verilir. Panelde yalnız store_admin+.';

create trigger set_store_bank_transfer_details_updated_at
  before update on public.store_bank_transfer_details
  for each row execute function public.set_updated_at();

alter table public.store_bank_transfer_details enable row level security;
revoke all on table public.store_bank_transfer_details from anon;

create policy store_bank_transfer_details_select_admin_tier on public.store_bank_transfer_details
  for select to authenticated using ((select public.is_store_admin_member(store_id)));
create policy store_bank_transfer_details_insert_admin_tier on public.store_bank_transfer_details
  for insert to authenticated with check ((select public.is_store_admin_member(store_id)));
create policy store_bank_transfer_details_update_admin_tier on public.store_bank_transfer_details
  for update to authenticated
  using ((select public.is_store_admin_member(store_id)))
  with check ((select public.is_store_admin_member(store_id)));
-- Silme: yönetici bilgiyi kaldırabilir (o andan itibaren IBAN hiçbir yerde gösterilmez).
create policy store_bank_transfer_details_delete_admin_tier on public.store_bank_transfer_details
  for delete to authenticated using ((select public.is_store_admin_member(store_id)));

-- Doğrulama (salt-okunur, uyguladıktan sonra):
--   select count(*) from public.store_bank_transfer_details;   -- 0
--   select policyname, cmd from pg_policies where tablename = 'store_bank_transfer_details' order by 1;   -- 4 satır
--   select has_table_privilege('anon', 'public.store_bank_transfer_details', 'select');   -- false
