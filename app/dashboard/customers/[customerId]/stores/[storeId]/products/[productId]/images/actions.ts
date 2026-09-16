"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productImageFormSchema } from "@/lib/validation/product-image";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { uploadProductImage, removeProductImageObject } from "@/lib/commerce/upload-product-image";
import type { ProductImageFormState } from "./form-state";

const INVALID_PRODUCT_MESSAGE = "Geçersiz ürün.";
const INVALID_VARIANT_MESSAGE = "Geçersiz varyant.";

/**
 * FAZ 2C-1 — no separate slug/sku here, so the only realistic 23505 is
 * the DB's partial unique index (`product_images_primary_per_product_idx`,
 * migration 0019: "at most one primary image per product"). Normal usage
 * never hits this — every write path below clears other primaries first
 * via clearOtherPrimaryImages() — this is only a safety-net message for a
 * race/edge case, same `Kaydedilemedi: ...` fallback shape as every other
 * action.ts in this codebase otherwise.
 */
function toFriendlyError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") {
    return "Bu üründe zaten bir birincil görsel var. Önce mevcut birincili değiştirin.";
  }
  return `Kaydedilemedi: ${error.message}`;
}

function readProductImageFormValues(productId: string, formData: FormData) {
  return {
    productId,
    variantId: formData.get("variantId") || undefined,
    storagePath: formData.get("storagePath"),
    altText: formData.get("altText"),
    sortOrder: formData.get("sortOrder") ?? 0,
    isPrimary: formData.get("isPrimary"),
  };
}

/** Same shape as readProductImageFormValues, but storagePath comes from the just-completed Storage upload (uploadProductImage's result), never from FormData — the create form no longer has a storagePath text field at all (see image-form.tsx). */
function readProductImageCreateMetadata(productId: string, formData: FormData, storagePath: string) {
  return {
    productId,
    variantId: formData.get("variantId") || undefined,
    storagePath,
    altText: formData.get("altText"),
    sortOrder: formData.get("sortOrder") ?? 0,
    isPrimary: formData.get("isPrimary"),
  };
}

/** The DB composite FK (product_id, store_id) -> products(id, store_id) is the real, final guard — this pre-SELECT is only for a cleaner error message, same technique as products/actions.ts's category/brand relation checks. */
async function assertProductBelongsToStore(productId: string, storeId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("products").select("id").eq("id", productId).eq("store_id", storeId).maybeSingle();
  return Boolean(data);
}

/** variant_id is nullable and there is no Variant CRUD yet (FAZ 2C-1 scope) — this only matters if a variantId is ever submitted (e.g. a future variant picker, or a tampered request), never populated by this phase's own form. Also confirms the variant belongs to THIS product, not just this store. */
async function assertVariantBelongsToProduct(variantId: string, productId: string, storeId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("product_variants")
    .select("id")
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .maybeSingle();
  return Boolean(data);
}

/** Un-sets is_primary on every other image of this product before a new one is promoted — avoids tripping the DB's partial unique index (see toFriendlyError above). Best-effort: a failure here just means the following insert/update may itself hit 23505, which is still handled. */
async function clearOtherPrimaryImages(productId: string, storeId: string, excludeImageId?: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .eq("is_primary", true);
  if (excludeImageId) query = query.neq("id", excludeImageId);

  const { error } = await query;
  if (error) {
    console.error("[product-images] failed to clear previous primary image:", error.message);
  }
}

/**
 * store_editor+ (RLS: product_images_insert_editor_tier — both at the
 * `product_images` table AND, independently, at the `product-images`
 * Storage bucket via migration 0020/0021's `product_images_storage_insert_editor`
 * policy, since the upload below runs through the SAME session-scoped
 * `createSupabaseServerClient()`, never a service-role client).
 *
 * Ordering is deliberate: cheap validation (auth, product/variant
 * ownership) happens BEFORE the actual Storage upload, so a request that
 * was always going to be rejected never spends bandwidth/Storage quota.
 * The upload itself happens before the DB insert (Storage and Postgres
 * share no transaction — see lib/commerce/upload-product-image.ts's own
 * doc comment); if anything AFTER a successful upload fails (schema
 * validation on the other fields, or the insert itself), the uploaded
 * object is removed via removeProductImageObject so a rejected/failed
 * submission never leaves an orphaned file behind.
 */
export async function createProductImageAction(
  customerId: string,
  storeId: string,
  productId: string,
  _prevState: ProductImageFormState,
  formData: FormData,
): Promise<ProductImageFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }

  const validProduct = await assertProductBelongsToStore(productId, storeId);
  if (!validProduct) return { error: INVALID_PRODUCT_MESSAGE };

  const variantIdRaw = formData.get("variantId");
  const variantId = typeof variantIdRaw === "string" && variantIdRaw ? variantIdRaw : undefined;
  if (variantId) {
    const validVariant = await assertVariantBelongsToProduct(variantId, productId, storeId);
    if (!validVariant) return { error: INVALID_VARIANT_MESSAGE };
  }

  const uploadResult = await uploadProductImage({ storeId, productId, file });
  if (!uploadResult.storagePath) {
    return { error: uploadResult.error ?? "Yükleme başarısız." };
  }
  const { storagePath } = uploadResult;

  const parsed = productImageFormSchema.safeParse(readProductImageCreateMetadata(productId, formData, storagePath));
  if (!parsed.success) {
    await removeProductImageObject(storagePath);
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  if (parsed.data.isPrimary) {
    await clearOtherPrimaryImages(productId, storeId);
  }

  const supabase = await createSupabaseServerClient();
  const { data: image, error } = await supabase
    .from("product_images")
    .insert({
      // storeId/productId come ONLY from the route params (bound in
      // images/page.tsx via .bind(null, customerId, storeId, productId)) —
      // the form never submits either field. storagePath comes ONLY from
      // uploadProductImage's own result — never trusted from FormData.
      store_id: storeId,
      product_id: productId,
      variant_id: parsed.data.variantId || null,
      storage_path: parsed.data.storagePath,
      alt_text: parsed.data.altText || null,
      sort_order: parsed.data.sortOrder,
      is_primary: parsed.data.isPrimary,
    })
    .select("id")
    .single();

  if (error || !image) {
    // Upload succeeded but the DB write didn't — clean up the now-orphaned
    // Storage object rather than leaving it behind (see doc comment above).
    await removeProductImageObject(storagePath);
    return { error: error ? toFriendlyError(error) : "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_image.create",
    entityType: "product_image",
    entityId: image.id,
    metadata: { productId, storagePath: parsed.data.storagePath, isPrimary: parsed.data.isPrimary },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}/images`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
  return { error: null };
}

/**
 * store_editor+ (RLS: product_images_update_editor_tier). Deliberately
 * does NOT touch is_primary — that flag has its own single-purpose action
 * (setPrimaryImageAction below), a one-click "make this THE primary"
 * button per row, rather than a checkbox buried in this edit form. Two
 * controls fighting over the same flag would be confusing; this mirrors
 * products' own split between the full update form and its standalone
 * toggleProductActiveAction for is_active.
 */
export async function updateProductImageAction(
  customerId: string,
  storeId: string,
  productId: string,
  imageId: string,
  _prevState: ProductImageFormState,
  formData: FormData,
): Promise<ProductImageFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = productImageFormSchema.safeParse(readProductImageFormValues(productId, formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validProduct = await assertProductBelongsToStore(productId, storeId);
  if (!validProduct) return { error: INVALID_PRODUCT_MESSAGE };

  if (parsed.data.variantId) {
    const validVariant = await assertVariantBelongsToProduct(parsed.data.variantId, productId, storeId);
    if (!validVariant) return { error: INVALID_VARIANT_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_images")
    .update({
      variant_id: parsed.data.variantId || null,
      storage_path: parsed.data.storagePath,
      alt_text: parsed.data.altText || null,
      sort_order: parsed.data.sortOrder,
      // is_primary intentionally omitted — see doc comment above.
    })
    // Row-id filter is NEVER trusted alone — store_id AND product_id are
    // always ANDed in, same discipline as every other update in this
    // codebase, tightened further here since this route is nested under
    // a specific productId.
    .eq("id", imageId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    return { error: toFriendlyError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_image.update",
    entityType: "product_image",
    entityId: imageId,
    metadata: { productId, storagePath: parsed.data.storagePath },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}/images`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
  return { error: null };
}

/** Bound per-row via `.bind(null, customerId, storeId, productId, imageId)` — store_editor+ (promoting an image is reversible, not the critical "kalıcı silme" tier). Clears every other primary on this product first, then promotes this one — see clearOtherPrimaryImages. */
export async function setPrimaryImageAction(
  customerId: string,
  storeId: string,
  productId: string,
  imageId: string,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  await clearOtherPrimaryImages(productId, storeId, imageId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    console.error("[product-images] failed to set primary image:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_image.set_primary",
    entityType: "product_image",
    entityId: imageId,
    metadata: { productId },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}/images`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
}

/**
 * Permanent delete — store_admin+ ONLY (RLS: product_images_delete_admin_tier,
 * plus the bucket's own product_images_storage_delete_admin policy for
 * the Storage side). Unlike deleting a product, this has no further
 * cascade (no child table references product_images) — a single "Sil"
 * click is enough, same as brands/categories, no window.confirm() needed.
 *
 * FAZ 2C-1C: now removes the real Storage object FIRST, then the DB row —
 * "orphan Storage object" (if DB delete then fails) is always less
 * harmful than "orphan DB row pointing at a deleted file" (a broken
 * preview in the admin list), so this ordering is deliberate (see FAZ
 * 2C-1B audit §H/I). The Storage `remove()` call is treated as
 * best-effort: a failure there is logged but does NOT block the DB
 * delete — this action has no error-reporting path back to the UI
 * (DeleteProductButton calls it as a plain `() => Promise<void>`, no
 * useActionState), so refusing to ever delete the DB row over a Storage
 * hiccup would leave the admin permanently stuck on a broken row with no
 * way to clear it. `storagePath` is read from the row being deleted, not
 * reconstructed, so it works even for a pre-upload-era metadata-only row
 * (FAZ 2C-1A) whose "path" was hand-typed text with no real Storage
 * object behind it — `remove()` on a non-existent path is a no-op, not
 * an error.
 */
export async function deleteProductImageAction(
  customerId: string,
  storeId: string,
  productId: string,
  imageId: string,
): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing?.storage_path) {
    await removeProductImageObject(existing.storage_path);
  }

  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    console.error("[product-images] failed to delete image:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_image.delete",
    entityType: "product_image",
    entityId: imageId,
    metadata: { productId },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}/images`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
}
