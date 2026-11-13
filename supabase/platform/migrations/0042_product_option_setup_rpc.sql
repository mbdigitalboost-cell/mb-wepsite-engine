-- =============================================================================
-- PLATFORM MIGRATION 0042
-- create_product_option_setup — Faz 26: tek adımda renk/varyant kurulumu.
--
-- Verified via list_migrations before writing this file: 0041 is the latest
-- applied migration, 0042 is unused.
--
-- NEDEN FONKSİYON: "Seçenekleri oluştur" butonu dört tabloya yazar
-- (option_groups, option_values, product_variants, variant_option_values) ve
-- devir metni ATOMİK olmasını istiyor — yarım kalmış kurulum (grup + değer
-- var, varyant yok) tam olarak Canik ürünündeki "renk kaydedilmedi"
-- sorununa yol açtı. supabase-js'te transaction yok; tek bir plpgsql
-- fonksiyon çağrısı tek transaction'dır, herhangi bir insert hata verirse
-- hepsi geri alınır.
--
-- GÜVENLİK: SECURITY INVOKER — fonksiyon çağıranın (authenticated, cookie
-- oturumu) RLS policy'leriyle çalışır; mevcut *_insert_editor_tier
-- policy'leri (store_editor+) gerçek yetki kapısı olmaya devam eder, bu
-- fonksiyon hiçbir yetki atlatmaz. anon/public'ten EXECUTE geri alınır.
-- Ek tutarlılık: tüm değerlerin grupları ve varyantların değerleri AYNI
-- ürüne ait olmalı (aksi hâlde exception → tam geri alma). Hesaplama
-- (hangi değer yeni, hangi kombinasyon eksik, SKU) uygulama katmanında;
-- fonksiyon yalnızca verilen satırları tek transaction'da yazar.
-- Varyant stoğu 0 başlar; admin ekranı "stok girin" uyarısı gösterir.
-- =============================================================================

create or replace function public.create_product_option_setup(
  p_store_id uuid,
  p_product_id uuid,
  p_group jsonb,
  p_values jsonb,
  p_variants jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v jsonb;
  created_count integer := 0;
begin
  if p_group is not null then
    insert into public.option_groups (id, store_id, product_id, name, sort_order)
    values ((p_group ->> 'id')::uuid, p_store_id, p_product_id, p_group ->> 'name', coalesce((p_group ->> 'sort_order')::integer, 0));
  end if;

  for v in select * from jsonb_array_elements(coalesce(p_values, '[]'::jsonb)) loop
    if not exists (
      select 1 from public.option_groups g
      where g.id = (v ->> 'option_group_id')::uuid and g.product_id = p_product_id and g.store_id = p_store_id
    ) then
      raise exception 'option group % does not belong to product', v ->> 'option_group_id';
    end if;
    insert into public.option_values (id, store_id, option_group_id, value, sort_order)
    values ((v ->> 'id')::uuid, p_store_id, (v ->> 'option_group_id')::uuid, v ->> 'value', coalesce((v ->> 'sort_order')::integer, 0));
  end loop;

  for v in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) loop
    insert into public.product_variants (id, store_id, product_id, sku, name, price, compare_at_price, stock, is_active, sort_order)
    values (
      (v ->> 'id')::uuid,
      p_store_id,
      p_product_id,
      v ->> 'sku',
      v ->> 'name',
      (v ->> 'price')::numeric,
      (v ->> 'compare_at_price')::numeric,
      0,
      true,
      coalesce((v ->> 'sort_order')::integer, 0)
    );

    if exists (
      select 1
      from jsonb_array_elements_text(v -> 'value_ids') as x(value_id)
      where not exists (
        select 1
        from public.option_values ov
        join public.option_groups g on g.id = ov.option_group_id
        where ov.id = x.value_id::uuid and g.product_id = p_product_id and g.store_id = p_store_id
      )
    ) then
      raise exception 'variant % references an option value outside the product', v ->> 'id';
    end if;

    insert into public.variant_option_values (variant_id, option_value_id, store_id)
    select (v ->> 'id')::uuid, x.value_id::uuid, p_store_id
    from jsonb_array_elements_text(v -> 'value_ids') as x(value_id);

    created_count := created_count + 1;
  end loop;

  return created_count;
end;
$$;

comment on function public.create_product_option_setup(uuid, uuid, jsonb, jsonb, jsonb) is
  'Faz 26 — seçenek grubu + değerler + varyantlar + variant_option_values tek transaction''da (SECURITY INVOKER: çağıranın RLS editor-tier policy''leri geçerli). Uygulama: app/dashboard/.../variants/color-variant-actions.ts → createOptionSetupAction.';

revoke all on function public.create_product_option_setup(uuid, uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_product_option_setup(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;
