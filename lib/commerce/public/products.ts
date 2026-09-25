import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/commerce/product-image-constants";
import type { PublicBrand } from "./brands";

/**
 * FAZ 2C-3 — public product/image read model.
 *
 * FIELD CONTRACT (deliberately narrower than the admin `products` row):
 * `sku` and `stock` are NEVER included here. `sku` is an internal
 * inventory identifier with no storefront value and a (small) information-
 * leak risk if scraped. `stock` (the raw count) is deliberately withheld
 * too — showing an exact inventory number is a common e-commerce anti-
 * pattern (competitor scraping, no real customer benefit over a simple
 * "in stock" signal). A derived boolean (`inStock: stock > 0 ||
 * !trackInventory`) could be added later without breaking this contract,
 * but wasn't required by this phase's spec and isn't added speculatively —
 * see FAZ 2C-3 STEP 22's own report for this decision.
 */
export interface PublicProduct {
  id: string;
  storeId: string;
  categoryId: string | null;
  brandId: string | null;
  /**
   * FAZ 2C STEP 33 — resolved brand (id/name/slug only, via
   * lib/commerce/public/brands.ts's PublicBrand — see attachBrandsToProducts
   * below). `null` whenever `brandId` is null OR the brand lookup failed;
   * never throws. Added as a genuinely new field (not a rename/removal of
   * anything `PublicProduct` already had), so existing callers reading only
   * the pre-existing fields are unaffected — backward compatible.
   */
  brand: PublicBrand | null;
  /** FAZ 2C-4 STEP 23 — free-text model attribute (e.g. "TP9 SFx"), migration 0027_products_model_column.sql (draft). Exposed so a future brand/model filter UI has the data ready; no filter UI built this phase. */
  model: string | null;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** FAZ 1 (mağaza sepeti/configurator) — a single selectable value within an option group (e.g. "Kırmızı"). */
export interface PublicOptionValue {
  id: string;
  value: string;
  sortOrder: number;
}

/** FAZ 1 — an option group (e.g. "Renk") with its nested, ordered values. */
export interface PublicOptionGroup {
  id: string;
  name: string;
  sortOrder: number;
  values: PublicOptionValue[];
}

/**
 * FAZ 1 — a sellable variant, resolved for the storefront configurator.
 * `price`/`compareAtPrice` mirror the DB's own nullable "inherit the
 * parent product's price" contract exactly (migration 0018's own table
 * comment) — resolving that inheritance is the CALLER's job (see
 * lib/commerce/pricing.ts), never done here. `sku`/raw `stock` withheld,
 * same field-contract reasoning as `PublicProduct` — `inStock` is the
 * only inventory signal exposed.
 */
export interface PublicProductVariant {
  id: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  inStock: boolean;
  /** option_value ids this variant is composed of — always >= 1 (see getPublicProductVariants's own filtering). */
  optionValueIds: string[];
}

/** FAZ 1 — an optional add-on (e.g. "Yan Cep +100"). `priceDelta` is added ON TOP of the active price, never a standalone/absolute price. */
export interface PublicProductAddon {
  id: string;
  name: string;
  priceDelta: number;
  imageUrl: string | null;
  isRequired: boolean;
  inStock: boolean;
}

export interface PublicProductImage {
  id: string;
  productId: string;
  variantId: string | null;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  /** Resolved via a short-lived signed URL — `storage_path` itself is never returned to the caller. `null` if signing failed. */
  url: string | null;
}

const PRODUCT_COLUMNS =
  "id, store_id, category_id, brand_id, model, name, slug, short_description, description, price, compare_at_price, is_active, sort_order, seo_title, seo_description";

type MappedProduct = Omit<PublicProduct, "brand">;

function mapProduct(row: {
  id: string;
  store_id: string;
  category_id: string | null;
  brand_id: string | null;
  model: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
}): MappedProduct {
  return {
    id: row.id,
    storeId: row.store_id,
    categoryId: row.category_id,
    brandId: row.brand_id,
    model: row.model,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

/**
 * FAZ 2C STEP 33 — resolves `brandId` -> `brand: {id,name,slug}|null` for
 * a batch of products in exactly ONE extra store-scoped query, regardless
 * of how many products are passed in (never N+1: no per-product query
 * here or anywhere else in this file). Mirrors the exact
 * fetch-once-then-Map-lookup shape getPublicProductImages already uses
 * for signing — no new query pattern introduced. Never throws; a lookup
 * failure just leaves every `brand` as `null` (fail-soft, same contract
 * as the rest of this file).
 */
async function attachBrandsToProducts(products: MappedProduct[], storeId: string): Promise<PublicProduct[]> {
  const brandIds = [...new Set(products.map((p) => p.brandId).filter((id): id is string => id !== null))];
  if (brandIds.length === 0) {
    return products.map((p) => ({ ...p, brand: null }));
  }

  const client = createSupabasePublicClient();
  const { data, error } = await client.from("brands").select("id, name, slug").eq("store_id", storeId).in("id", brandIds);

  if (error) {
    console.error("[commerce/public] attachBrandsToProducts failed:", error.message);
    return products.map((p) => ({ ...p, brand: null }));
  }

  const brandById = new Map((data ?? []).map((b) => [b.id, { id: b.id, name: b.name, slug: b.slug }]));
  return products.map((p) => ({ ...p, brand: p.brandId ? (brandById.get(p.brandId) ?? null) : null }));
}

/**
 * RLS (migration 0017's `products_select_public_active`) already restricts
 * anon rows to `is_active = true` on a publicly-visible store — `categoryId`/
 * `brandId`/`model` are additional, optional narrowing filters for the
 * category grid and future brand/model filtering (STEP 33), not a security
 * boundary. `brandId` is a resolved id (callers resolve a `?brand=` slug via
 * getPublicBrandBySlug first, same store-scoped-resolution-before-filtering
 * pattern the category route already uses) — this function never accepts a
 * raw slug itself. `model` matches the free-text `products.model` column
 * exactly (`.eq`, not a slug) — see brands.ts/this file's own STEP 33 notes
 * on why an exact match was chosen over a slugified one. Both values reach
 * Postgres only through the Supabase query builder's own parameterized
 * `.eq()` — never string-interpolated into raw SQL.
 */
export async function getPublicProducts(
  storeId: string,
  options: { categoryId?: string; brandId?: string; model?: string } = {},
): Promise<PublicProduct[]> {
  const client = createSupabasePublicClient();

  let query = client.from("products").select(PRODUCT_COLUMNS).eq("store_id", storeId);
  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }
  if (options.brandId) {
    query = query.eq("brand_id", options.brandId);
  }
  if (options.model) {
    query = query.eq("model", options.model);
  }

  const { data, error } = await query.order("sort_order", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicProducts failed:", error.message);
    return [];
  }

  return attachBrandsToProducts((data ?? []).map(mapProduct), storeId);
}

export async function getPublicProductBySlug(storeId: string, productSlug: string): Promise<PublicProduct | null> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("store_id", storeId)
    .eq("slug", productSlug)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getPublicProductBySlug failed:", error.message);
    return null;
  }

  if (!data) return null;
  const [withBrand] = await attachBrandsToProducts([mapProduct(data)], storeId);
  return withBrand;
}

/**
 * Reads image rows through the ANON client first (so `product_images`'s
 * own `product_images_select_public_active` RLS — migration 0019, parent
 * product must be `is_active`, store must be publicly visible — is the
 * real visibility gate, same as every other public read model here).
 *
 * Signing itself then goes through `createSupabaseAdminClient()`
 * (service-role) because the `product-images` Storage bucket has NO anon
 * `storage.objects` SELECT policy today (migration 0020 only grants
 * `authenticated` + `is_store_member`) — see migration 0024's own header
 * comment for why this phase deliberately does NOT add one. This is NOT a
 * visibility bypass: by the time a row reaches this function, the anon
 * RLS query above has already proven it's a publicly-visible row: the
 * admin client here only performs the last-mile signing operation on a
 * `storage_path` that came from an already-authorized row, never signs an
 * arbitrary caller-supplied path.
 */
export async function getPublicProductImages(storeId: string, productId: string): Promise<PublicProductImage[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("product_images")
    .select("id, product_id, variant_id, storage_path, alt_text, sort_order, is_primary")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicProductImages failed:", error.message);
    return [];
  }

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const admin = createSupabaseAdminClient();

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed, error: signError } = await admin.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .createSignedUrl(row.storage_path, 3600);

      if (signError) {
        console.error("[commerce/public] getPublicProductImages signing failed:", row.id, signError.message);
      }

      return {
        id: row.id,
        productId: row.product_id,
        variantId: row.variant_id,
        altText: row.alt_text,
        sortOrder: row.sort_order,
        isPrimary: row.is_primary,
        url: signed?.signedUrl ?? null,
      };
    }),
  );
}

/**
 * FAZ 1 (mağaza sepeti/configurator) — this product's option groups +
 * nested values, for the storefront configurator. RLS
 * (`option_groups_select_public_active`/`option_values_select_public_active`,
 * migration 0024, live in production) is the real visibility gate — both
 * already require the parent product to be `is_active` and the store to
 * be publicly visible, so no extra filter is added here.
 *
 * Two queries total, never N+1: option_values is fetched ONCE for every
 * group id in a single `.in()` call, then nested via a Map lookup — same
 * fetch-once-then-Map-lookup shape as attachBrandsToProducts above.
 */
export async function getPublicProductOptions(storeId: string, productId: string): Promise<PublicOptionGroup[]> {
  const client = createSupabasePublicClient();

  const { data: groups, error: groupsError } = await client
    .from("option_groups")
    .select("id, name, sort_order")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (groupsError) {
    console.error("[commerce/public] getPublicProductOptions failed (groups):", groupsError.message);
    return [];
  }
  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: values, error: valuesError } = await client
    .from("option_values")
    .select("id, option_group_id, value, sort_order")
    .eq("store_id", storeId)
    .in("option_group_id", groupIds)
    .order("sort_order", { ascending: true });

  if (valuesError) {
    console.error("[commerce/public] getPublicProductOptions failed (values):", valuesError.message);
    // Groups without any values are useless to the configurator (nothing
    // to select) — same fail-soft posture as the rest of this file, but
    // returning an empty array here (not `groups` with empty `values`)
    // avoids the configurator rendering an unselectable empty group.
    return [];
  }

  const valuesByGroupId = new Map<string, PublicOptionValue[]>();
  for (const v of values ?? []) {
    const list = valuesByGroupId.get(v.option_group_id) ?? [];
    list.push({ id: v.id, value: v.value, sortOrder: v.sort_order });
    valuesByGroupId.set(v.option_group_id, list);
  }

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    sortOrder: g.sort_order,
    values: valuesByGroupId.get(g.id) ?? [],
  }));
}

/**
 * FAZ 1 — this product's sellable variants, resolved for the storefront
 * configurator. RLS (`product_variants_select_public_active`, migration
 * 0018) already requires the variant's OWN `is_active` AND the parent
 * product's `is_active` — no extra filter added here, same as every other
 * function in this file.
 *
 * DELIBERATE FILTER — a variant with ZERO option_value links (e.g. a row
 * created via createProductVariantAction but never assigned any option
 * values through setVariantOptionValuesAction — a real state, confirmed
 * against Taktikalp46's own test data) has no way to be selected through
 * the option-group UI at all, so it's dropped here rather than reaching
 * the configurator as an unreachable, confusing entry. See variants-tab.tsx
 * for the matching admin-side warning that flags this same state.
 *
 * Two queries total: variant_option_values fetched ONCE for every variant
 * id in a single `.in()` call, then grouped via a Map — same shape as
 * getPublicProductOptions above.
 */
export async function getPublicProductVariants(storeId: string, productId: string): Promise<PublicProductVariant[]> {
  const client = createSupabasePublicClient();

  const { data: variants, error: variantsError } = await client
    .from("product_variants")
    .select("id, name, price, compare_at_price, stock, sort_order")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (variantsError) {
    console.error("[commerce/public] getPublicProductVariants failed (variants):", variantsError.message);
    return [];
  }
  if (!variants || variants.length === 0) return [];

  const variantIds = variants.map((v) => v.id);
  const { data: links, error: linksError } = await client
    .from("variant_option_values")
    .select("variant_id, option_value_id")
    .eq("store_id", storeId)
    .in("variant_id", variantIds);

  if (linksError) {
    console.error("[commerce/public] getPublicProductVariants failed (links):", linksError.message);
    return [];
  }

  const optionValueIdsByVariant = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = optionValueIdsByVariant.get(link.variant_id) ?? [];
    list.push(link.option_value_id);
    optionValueIdsByVariant.set(link.variant_id, list);
  }

  return variants
    .map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price === null ? null : Number(v.price),
      compareAtPrice: v.compare_at_price === null ? null : Number(v.compare_at_price),
      inStock: v.stock > 0,
      optionValueIds: optionValueIdsByVariant.get(v.id) ?? [],
    }))
    .filter((v) => v.optionValueIds.length > 0);
}

/**
 * FAZ 1 — this product's optional add-ons. RLS
 * (`product_addons_select_public_active`, migration 0022) already
 * requires `is_active` on both the add-on and the parent product — no
 * extra filter added here.
 *
 * `inStock`: unlike product_variants (no track_inventory column at all —
 * stock is always tracked there), product_addons DOES have its own
 * `track_inventory` flag (migration 0022) — when it's false, `stock` is
 * irrelevant/may be null, so the add-on is always treated as in stock.
 */
export async function getPublicProductAddons(storeId: string, productId: string): Promise<PublicProductAddon[]> {
  const client = createSupabasePublicClient();

  const { data, error } = await client
    .from("product_addons")
    .select("id, name, price_delta, stock, track_inventory, image_url, is_required")
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[commerce/public] getPublicProductAddons failed:", error.message);
    return [];
  }

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    priceDelta: Number(a.price_delta),
    imageUrl: a.image_url,
    isRequired: a.is_required,
    inStock: !a.track_inventory || (a.stock !== null && a.stock > 0),
  }));
}
