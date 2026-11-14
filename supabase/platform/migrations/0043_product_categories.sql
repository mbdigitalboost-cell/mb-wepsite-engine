-- =============================================================================
-- PLATFORM MIGRATION 0043
-- product_categories — Faz 27: bir ürün birden çok kategoride.
--
-- Verified via list_migrations before writing this file: 0042 is the latest
-- applied migration, 0043 is unused.
--
-- KARAR (devir metni §A.2, yol 1): products.category_id KALIYOR ve her zaman
-- "ana kategori"nin (product_categories.is_primary) AYNASI. Breadcrumb/SEO,
-- admin listesi, CSV içe aktarma, toplu "kategori ata", ürün kopyalama gibi
-- category_id yazan/okuyan mevcut yollar değişmeden çalışır. Tutarlılık
-- uygulama kodunun disiplinine bırakılmadı, iki trigger ile veritabanında
-- garanti ediliyor:
--   * products.category_id INSERT/UPDATE (eski yollar) → bağlantı tablosu:
--     eski ana bağ kaldırılır, yenisi ana yapılır (eski "tek kategori"
--     davranışının birebir karşılığı: kategori DEĞİŞTİRME, ekleme değil).
--   * product_categories INSERT/UPDATE/DELETE → products.category_id:
--     ana bağ hangisiyse o; ana bağ silinirse kalanlardan en eskisi ana
--     yapılır; hiç bağ kalmazsa NULL.
--   Transaction-local bayrak (app.product_category_sync) iki trigger'ın
--   birbirini sonsuz tetiklemesini engeller: her yön kendi değişikliğinin
--   karşı tarafını kendisi yazar. pg_trigger_depth() BİLEREK kullanılmadı —
--   FK cascade'leri (kategori silme) dahili trigger olarak derinliği artırır
--   ve senkron tam o durumda atlanırdı.
--
-- RLS (products/categories ile aynı model):
--   SELECT anon  : mağaza herkese açık + ürün aktif (products_select_public_active ile aynı kapı).
--   SELECT auth  : is_store_member.
--   INSERT/UPDATE: is_store_editor_member.
--   DELETE       : is_store_editor_member — BİLİNÇLİ SAPMA: bağ satırı içerik
--                  taşımaz; silmek yalnız "bu ürün şu kategoride değil" demek.
--                  store_editor zaten products.category_id'yi değiştirerek aynı
--                  etkiyi yaratabiliyor; admin'e kısıtlamak editörün ürün
--                  formunda kategori işaretini kaldıramaması demekti.
-- =============================================================================

create table public.product_categories (
  product_id uuid not null,
  category_id uuid not null,
  store_id uuid not null references public.stores (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_categories_pkey primary key (product_id, category_id),
  constraint product_categories_product_fkey foreign key (product_id, store_id)
    references public.products (id, store_id) on delete cascade,
  constraint product_categories_category_fkey foreign key (category_id, store_id)
    references public.categories (id, store_id) on delete cascade
);

comment on table public.product_categories is
  'Faz 27 — ürün ↔ kategori (çoklu). is_primary=true olan tek satır products.category_id ile trigger üzerinden senkron (bkz. migration 0043 başlığı).';

create unique index product_categories_one_primary_idx
  on public.product_categories (product_id)
  where is_primary;

create index product_categories_category_idx on public.product_categories (category_id);
create index product_categories_store_idx on public.product_categories (store_id);

alter table public.product_categories enable row level security;

create policy product_categories_select_public_active on public.product_categories
  for select to anon
  using (
    (select public.is_store_publicly_visible(product_categories.store_id))
    and exists (
      select 1 from public.products p
      where p.id = product_categories.product_id and p.store_id = product_categories.store_id and p.is_active = true
    )
  );

create policy product_categories_select_member_or_admin on public.product_categories
  for select to authenticated
  using ((select public.is_store_member(product_categories.store_id)));

create policy product_categories_insert_editor_tier on public.product_categories
  for insert to authenticated
  with check ((select public.is_store_editor_member(product_categories.store_id)));

create policy product_categories_update_editor_tier on public.product_categories
  for update to authenticated
  using ((select public.is_store_editor_member(product_categories.store_id)))
  with check ((select public.is_store_editor_member(product_categories.store_id)));

create policy product_categories_delete_editor_tier on public.product_categories
  for delete to authenticated
  using ((select public.is_store_editor_member(product_categories.store_id)));

-- ---------------------------------------------------------------------------
-- Tek ana kategori: yeni/güncellenen satır ana ise aynı ürünün diğer ana
-- satırı önce düşürülür (partial unique index'e takılmadan).
-- ---------------------------------------------------------------------------
create or replace function public.product_categories_demote_other_primary()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_primary then
    update public.product_categories
      set is_primary = false
      where product_id = new.product_id and category_id <> new.category_id and is_primary;
  end if;
  return new;
end;
$$;

create trigger product_categories_demote_other_primary
  before insert or update of is_primary on public.product_categories
  for each row execute function public.product_categories_demote_other_primary();

-- ---------------------------------------------------------------------------
-- Bağ tablosu → products.category_id aynası.
-- ---------------------------------------------------------------------------
create or replace function public.product_categories_sync_product()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_product uuid := coalesce(new.product_id, old.product_id);
  primary_category uuid;
begin
  if current_setting('app.product_category_sync', true) = 'on' then
    return null;
  end if;
  perform set_config('app.product_category_sync', 'on', true);

  select category_id into primary_category
  from public.product_categories
  where product_id = target_product and is_primary
  limit 1;

  if primary_category is null then
    -- Ana bağ yok ama başka bağ var → en eskisi ana olur.
    select category_id into primary_category
    from public.product_categories
    where product_id = target_product
    order by created_at, category_id
    limit 1;
    if primary_category is not null then
      update public.product_categories set is_primary = true
        where product_id = target_product and category_id = primary_category;
    end if;
  end if;

  update public.products
    set category_id = primary_category
    where id = target_product and category_id is distinct from primary_category;

  perform set_config('app.product_category_sync', 'off', true);
  return null;
end;
$$;

create trigger product_categories_sync_product
  after insert or update or delete on public.product_categories
  for each row execute function public.product_categories_sync_product();

-- ---------------------------------------------------------------------------
-- products.category_id (eski yollar) → bağ tablosu.
-- ---------------------------------------------------------------------------
create or replace function public.products_sync_primary_category()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.product_category_sync', true) = 'on' then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then
    return null;
  end if;
  perform set_config('app.product_category_sync', 'on', true);

  -- Eski ana bağ "değiştirilen" kategoridir: kaldır (eski tek-kategori semantiği).
  if tg_op = 'UPDATE' and old.category_id is not null then
    delete from public.product_categories
      where product_id = new.id and category_id = old.category_id and is_primary;
  end if;

  if new.category_id is not null then
    insert into public.product_categories (product_id, category_id, store_id, is_primary)
    values (new.id, new.category_id, new.store_id, true)
    on conflict (product_id, category_id) do update set is_primary = true;
  end if;

  perform set_config('app.product_category_sync', 'off', true);
  return null;
end;
$$;

create trigger products_sync_primary_category
  after insert or update of category_id on public.products
  for each row execute function public.products_sync_primary_category();

revoke all on function public.product_categories_demote_other_primary() from public, anon;
revoke all on function public.product_categories_sync_product() from public, anon;
revoke all on function public.products_sync_primary_category() from public, anon;

-- ---------------------------------------------------------------------------
-- Ürün formundan TOPLU kategori yazımı (atomik): verilen küme dışındaki
-- bağlar silinir, eksikler eklenir, ana kategori işaretlenir. SECURITY
-- INVOKER — çağıranın RLS'i geçerli. category_id aynası trigger'la gelir.
-- ---------------------------------------------------------------------------
create or replace function public.set_product_categories(
  p_store_id uuid,
  p_product_id uuid,
  p_category_ids uuid[],
  p_primary_category_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  link_count integer;
begin
  if p_primary_category_id is not null and not (p_primary_category_id = any (coalesce(p_category_ids, '{}'))) then
    raise exception 'primary category must be one of the selected categories';
  end if;

  delete from public.product_categories
    where product_id = p_product_id and store_id = p_store_id
      and not (category_id = any (coalesce(p_category_ids, '{}')));

  insert into public.product_categories (product_id, category_id, store_id, is_primary)
  select p_product_id, c, p_store_id, false
  from unnest(coalesce(p_category_ids, '{}')) as c
  on conflict (product_id, category_id) do nothing;

  if p_primary_category_id is not null then
    update public.product_categories set is_primary = true
      where product_id = p_product_id and category_id = p_primary_category_id;
  end if;

  select count(*) into link_count from public.product_categories where product_id = p_product_id;
  return link_count;
end;
$$;

revoke all on function public.set_product_categories(uuid, uuid, uuid[], uuid) from public, anon;
grant execute on function public.set_product_categories(uuid, uuid, uuid[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Mevcut veri: category_id dolu her ürün ana kategorisiyle bağlanır.
-- ---------------------------------------------------------------------------
insert into public.product_categories (product_id, category_id, store_id, is_primary)
select p.id, p.category_id, p.store_id, true
from public.products p
where p.category_id is not null
on conflict (product_id, category_id) do nothing;
