"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/lib/validation/product";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { ProductFormState } from "./form-state";

const INVALID_CATEGORY_MESSAGE = "Geçersiz kategori.";
const INVALID_BRAND_MESSAGE = "Geçersiz marka.";

/**
 * Postgres unique_violation (23505) on either products_slug_unique or
 * products_sku_unique (both (store_id, col)) -> distinct friendly
 * messages, per constraint name in the error message (same technique
 * every PostgrestError-consuming action in this codebase relies on since
 * the client doesn't expose a structured constraint field). Anything else
 * falls back to the same `Kaydedilemedi: ${error.message}` shape as
 * brands/categories.
 */
function toFriendlyError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("products_slug_unique")) return "Bu slug bu mağazada zaten kullanılıyor.";
    if (error.message.includes("products_sku_unique")) return "Bu SKU bu mağazada zaten kullanılıyor.";
    if (error.message.includes("products_barcode_unique")) return "Bu barkod bu mağazada zaten kullanılıyor.";
    return "Bu değer bu mağazada zaten kullanılıyor.";
  }
  return `Kaydedilemedi: ${error.message}`;
}

function readProductFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    model: formData.get("model"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    brandId: formData.get("brandId"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || undefined,
    stock: formData.get("stock"),
    trackInventory: formData.get("trackInventory"),
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder") ?? 0,
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
  };
}

/**
 * The DB composite FK (category_id, store_id) -> categories(id, store_id)
 * / (brand_id, store_id) -> brands(id, store_id) is the real, final
 * cross-tenant guard (migration 0017's P0 MIGRATION HARDENING FIX) — this
 * pre-SELECT is only here for a cleaner, field-specific error message
 * instead of a raw foreign-key-violation (23503) surfacing to the admin.
 */
async function assertBelongsToStore(table: "categories" | "brands", id: string, storeId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from(table).select("id").eq("id", id).eq("store_id", storeId).maybeSingle();
  return Boolean(data);
}

async function validateRelations(
  categoryId: string,
  brandId: string,
  storeId: string,
): Promise<string | null> {
  if (categoryId) {
    const validCategory = await assertBelongsToStore("categories", categoryId, storeId);
    if (!validCategory) return INVALID_CATEGORY_MESSAGE;
  }
  if (brandId) {
    const validBrand = await assertBelongsToStore("brands", brandId, storeId);
    if (!validBrand) return INVALID_BRAND_MESSAGE;
  }
  return null;
}

/** store_editor+ (RLS: products_insert_editor_tier). Redirects to the new product's detail page on success — same "create redirects to detail" shape as content/[type]/actions.ts's createContentItemAction. */
export async function createProductAction(
  customerId: string,
  storeId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = productFormSchema.safeParse(readProductFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const relationError = await validateRelations(parsed.data.categoryId ?? "", parsed.data.brandId ?? "", storeId);
  if (relationError) return { error: relationError };

  const supabase = await createSupabaseServerClient();
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      // storeId comes ONLY from the route param (bound in
      // products/new/page.tsx via .bind(null, customerId, storeId)) — the
      // form never submits a store_id/storeId field.
      store_id: storeId,
      category_id: parsed.data.categoryId || null,
      brand_id: parsed.data.brandId || null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      sku: parsed.data.sku,
      barcode: parsed.data.barcode || null,
      model: parsed.data.model || null,
      short_description: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compare_at_price: parsed.data.compareAtPrice ?? null,
      stock: parsed.data.stock,
      track_inventory: parsed.data.trackInventory,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: toFriendlyError(error) };
  }
  if (!product) {
    return { error: "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.create",
    entityType: "product",
    entityId: product.id,
    metadata: { name: parsed.data.name, slug: parsed.data.slug, sku: parsed.data.sku },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidateTag(storeProductsTag(storeId), "max");
  // Unified tabbed product screen: land the admin on the Görseller tab
  // right after creating a product, since that's typically the next
  // thing they add — see [productId]/page.tsx / product-tabs.tsx.
  redirect(`/dashboard/customers/${customerId}/stores/${storeId}/products/${product.id}?tab=images`);
}

/** store_editor+ (RLS: products_update_editor_tier). Also handles the is_active toggle when submitted through the full form (a separate lighter-weight toggleProductActiveAction exists for the detail page's standalone toggle button). */
export async function updateProductAction(
  customerId: string,
  storeId: string,
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = productFormSchema.safeParse(readProductFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const relationError = await validateRelations(parsed.data.categoryId ?? "", parsed.data.brandId ?? "", storeId);
  if (relationError) return { error: relationError };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.categoryId || null,
      brand_id: parsed.data.brandId || null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      sku: parsed.data.sku,
      barcode: parsed.data.barcode || null,
      model: parsed.data.model || null,
      short_description: parsed.data.shortDescription || null,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compare_at_price: parsed.data.compareAtPrice ?? null,
      stock: parsed.data.stock,
      track_inventory: parsed.data.trackInventory,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
    })
    // Row-id filter is NEVER trusted alone — store_id is always ANDed in,
    // same discipline as every other update in this codebase.
    .eq("id", productId)
    .eq("store_id", storeId);

  if (error) {
    return { error: toFriendlyError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.update",
    entityType: "product",
    entityId: productId,
    metadata: { name: parsed.data.name, slug: parsed.data.slug, isActive: parsed.data.isActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
  return { error: null };
}

/** Bound per-page via `.bind(null, customerId, storeId, productId, nextActive)` — store_editor+ (deactivating/reactivating is reversible, not the critical "kalıcı silme" tier). Same lighter-weight-toggle shape as navigation's toggleNavigationItemActiveAction. */
export async function toggleProductActiveAction(
  customerId: string,
  storeId: string,
  productId: string,
  nextActive: boolean,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: nextActive })
    .eq("id", productId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[products] failed to toggle product active state:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.update",
    entityType: "product",
    entityId: productId,
    metadata: { isActive: nextActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
}

/**
 * Permanent delete — store_admin+ ONLY (RLS: products_delete_admin_tier).
 * Unlike brand/category delete, this is NOT schema-safe-by-default: a
 * product's option_groups/product_variants/product_images (and, through
 * variants, variant_option_values) all reference it with
 * `on delete cascade` (migrations 0018/0019) — deleting a product takes
 * all of that with it. This is why delete-product-button.tsx requires an
 * explicit window.confirm() before submitting, the first confirm dialog
 * in this codebase (every other permanent delete here is a single "Sil"
 * click, safe because nothing else cascades from it).
 */
export async function deleteProductAction(customerId: string, storeId: string, productId: string): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").delete().eq("id", productId).eq("store_id", storeId);
  if (error) {
    console.error("[products] failed to delete product:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.delete",
    entityType: "product",
    entityId: productId,
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidateTag(storeProductsTag(storeId), "max");
  redirect(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
}
