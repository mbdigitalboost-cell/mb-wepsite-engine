import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * FAZ 9 — admin-side equivalent of lib/commerce/public/brands.ts's
 * getPublicBrandModels, but deliberately NOT that function reused as-is:
 * this reads through the authenticated dashboard client (already gated by
 * requireStoreEditorAccess upstream in product-form.tsx's two callers),
 * and INCLUDES inactive products' models too — an admin editing the
 * catalog should see every model ever typed for a brand, not just what's
 * currently publicly visible, unlike the storefront's own picker.
 *
 * Returns a per-brand-id map (not a single brand's list) so
 * product-form.tsx can swap its "önceden kullanılmış modeller" suggestions
 * the moment the admin changes the Marka select, with zero extra
 * requests — one query for the whole store, grouped client-side.
 *
 * Fetches every product's (brand_id, models) in the store — fine at this
 * catalog's current scale (dozens of products); if a store's catalog ever
 * grows into the thousands, this would be worth narrowing to `.not(
 * "models", "is", null)` at the query level (already done below) plus a
 * dedicated RPC, not attempted here since it wasn't asked for and the
 * current scale doesn't need it.
 */
export async function getStoreModelsByBrand(storeId: string): Promise<Record<string, string[]>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("brand_id, models")
    .eq("store_id", storeId)
    .not("brand_id", "is", null)
    .not("models", "is", null);

  if (error) {
    console.error("[products] getStoreModelsByBrand failed:", error.message);
    return {};
  }

  const setsByBrand = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!row.brand_id || !row.models) continue;
    const set = setsByBrand.get(row.brand_id) ?? new Set<string>();
    for (const model of row.models) {
      const trimmed = model?.trim();
      if (trimmed) set.add(trimmed);
    }
    setsByBrand.set(row.brand_id, set);
  }

  const result: Record<string, string[]> = {};
  for (const [brandId, set] of setsByBrand) {
    result[brandId] = [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }
  return result;
}
