import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * FAZ 2C STEP 33 — public read model, brands. Deliberately narrower than
 * `PublicCategory` (which also carries `storeId`): this turn's own spec
 * says "store_id gibi internal tenant alanlarını client response modeline
 * gereksiz yere taşıma" — a brand has no parent/child relationship a
 * consumer would ever need `storeId` for (unlike categories, whose
 * `parentId` is genuinely useful to callers), so it's left out here.
 */
export interface PublicBrand {
  id: string;
  name: string;
  slug: string;
}

const BRAND_COLUMNS = "id, name, slug";

function mapBrand(row: { id: string; name: string; slug: string }): PublicBrand {
  return { id: row.id, name: row.name, slug: row.slug };
}

/**
 * RLS (migration 0016's own `brands_select_public_active`) already
 * restricts anon rows to `is_active = true` on a publicly-visible store —
 * this function adds no extra filter beyond `store_id`, same fail-soft
 * contract (never throws, `[]`/`null` on error, logged server-side only)
 * as every other lib/commerce/public/* read model.
 */
export async function getPublicBrands(storeId: string): Promise<PublicBrand[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicBrands failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapBrand);
}

export async function getPublicBrandBySlug(storeId: string, brandSlug: string): Promise<PublicBrand | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("store_id", storeId)
    .eq("slug", brandSlug)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getPublicBrandBySlug failed:", error.message);
    return null;
  }

  if (!data) return null;
  return mapBrand(data);
}

/**
 * FAZ 2C STEP 33 — brands actually represented among a category's active,
 * publicly-visible products (not just "every brand this store has") — the
 * useful set for a future "bu kategoride şu markalar var" filter control.
 * Two store-scoped queries, no N+1: (1) distinct brand_id's among this
 * category's products, (2) one batched `brands` lookup for those ids.
 * Infrastructure only this turn — no route currently calls this (see
 * STEP 33 report's own "Brand filtering" section for why: this turn adds
 * the read model, not a rendered brand-filter UI).
 */
export async function getPublicBrandsForCategory(storeId: string, categoryId: string): Promise<PublicBrand[]> {
  const client = createSupabasePublicClient();

  const { data: productRows, error: productsError } = await client
    .from("products")
    .select("brand_id")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .not("brand_id", "is", null);

  if (productsError) {
    console.error("[commerce/public] getPublicBrandsForCategory product lookup failed:", productsError.message);
    return [];
  }

  const brandIds = [...new Set((productRows ?? []).map((row) => row.brand_id).filter((id): id is string => id !== null))];
  if (brandIds.length === 0) return [];

  const { data: brandRows, error: brandsError } = await client
    .from("brands")
    .select(BRAND_COLUMNS)
    .eq("store_id", storeId)
    .in("id", brandIds)
    .order("name", { ascending: true });

  if (brandsError) {
    console.error("[commerce/public] getPublicBrandsForCategory brand lookup failed:", brandsError.message);
    return [];
  }

  return (brandRows ?? []).map(mapBrand);
}

/**
 * FAZ 7.1 — infrastructure only, no UI calls this yet (Faz 7.2's own
 * storefront flow is the intended caller — a future "önce marka, sonra
 * model seç" picker). DISTINCT, non-empty `model` values among a brand's
 * products in this store, alphabetically sorted. Same fail-soft contract
 * and the same "RLS is the real gate" posture as getPublicProducts (this
 * file's sibling, lib/commerce/public/products.ts) — no extra
 * `is_active` filter here either, migration 0017's own
 * `products_select_public_active` policy already restricts anon rows to
 * active products on a publicly-visible store.
 */
export async function getPublicBrandModels(storeId: string, brandId: string): Promise<string[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("products")
    .select("model")
    .eq("store_id", storeId)
    .eq("brand_id", brandId)
    .not("model", "is", null);

  if (error) {
    console.error("[commerce/public] getPublicBrandModels failed:", error.message);
    return [];
  }

  const models = new Set<string>();
  for (const row of data ?? []) {
    const trimmed = row.model?.trim();
    if (trimmed) models.add(trimmed);
  }

  return [...models].sort((a, b) => a.localeCompare(b, "tr"));
}
