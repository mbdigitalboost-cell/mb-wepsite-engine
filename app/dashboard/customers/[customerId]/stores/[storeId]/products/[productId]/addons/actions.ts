"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productAddonFormSchema } from "@/lib/validation/product-addon";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { ProductAddonFormState } from "./form-state";

const INVALID_PRODUCT_MESSAGE = "Geçersiz ürün.";

/**
 * CRITICAL — bu dosyanın HİÇBİR fonksiyonu, formData'dan/parsed
 * validation sonucundan gelen bir "total"/"unit_price"/"addon_total"
 * alanını KABUL ETMEZ veya bir insert/update'e yazmaz — çünkü öyle bir
 * alan hiçbir zaman var olmadı (productAddonFormSchema'da da yok, bkz.
 * lib/validation/product-addon.ts'in kendi CRITICAL yorumu). `priceDelta`
 * burada SADECE admin'in DB'ye kaydettiği add-on fiyat farkıdır — bu
 * fazda henüz sepet/sipariş akışı YOK, ama gelecekte biri gelecekse o
 * akışın kendi server-authoritative pricing engine'i (lib/commerce/
 * pricing.ts, henüz yazılmadı) her zaman productId/variantId/addonIds
 * üzerinden DB'den TAZE fiyat çekecek — client'tan gelen hiçbir price
 * alanı asla bu veya başka bir insert/update'e doğrudan yazılmayacak.
 */
function revalidateAddonsSurface(customerId: string, storeId: string, productId: string) {
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}/addons`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
}

/** The DB composite FK (product_id, store_id) -> products(id, store_id) is the real, final guard — this pre-SELECT is only here for a cleaner, field-specific error message, same technique as products/actions.ts, images/actions.ts and variants/actions.ts. */
async function assertProductBelongsToStore(productId: string, storeId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("products").select("id").eq("id", productId).eq("store_id", storeId).maybeSingle();
  return Boolean(data);
}

function toFriendlyAddonError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") return "Bu SKU bu mağazada zaten kullanılıyor.";
  return `Kaydedilemedi: ${error.message}`;
}

function readProductAddonFormValues(productId: string, formData: FormData) {
  return {
    productId,
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    priceDelta: formData.get("priceDelta") ?? 0,
    // Empty-string -> undefined, NOT 0: a blank stock field means "stok
    // takip edilmiyor / sınırsız" (migration 0022's own nullable
    // rationale), never "0 adet stok var". z.coerce.number() would
    // otherwise silently coerce "" to 0 and corrupt that meaning — same
    // normalization products/actions.ts already applies to
    // compareAtPrice, and product-addon.ts's own doc comment calls this
    // out explicitly.
    stock: formData.get("stock") || undefined,
    trackInventory: formData.get("trackInventory"),
    imageUrl: formData.get("imageUrl") || undefined,
    isRequired: formData.get("isRequired"),
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder") ?? 0,
  };
}

/** store_editor+ (RLS: product_addons_insert_editor_tier). */
export async function createAddonAction(
  customerId: string,
  storeId: string,
  productId: string,
  _prevState: ProductAddonFormState,
  formData: FormData,
): Promise<ProductAddonFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = productAddonFormSchema.safeParse(readProductAddonFormValues(productId, formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validProduct = await assertProductBelongsToStore(productId, storeId);
  if (!validProduct) return { error: INVALID_PRODUCT_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { data: addon, error } = await supabase
    .from("product_addons")
    .insert({
      // storeId/productId come ONLY from the route params (bound in the
      // addons page via .bind(null, customerId, storeId, productId)) —
      // the form never submits either field, and priceDelta is the
      // admin-set delta, never a client-supplied total (see CRITICAL
      // comment above).
      store_id: storeId,
      product_id: productId,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      price_delta: parsed.data.priceDelta,
      stock: parsed.data.stock ?? null,
      track_inventory: parsed.data.trackInventory,
      image_url: parsed.data.imageUrl || null,
      is_required: parsed.data.isRequired,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error || !addon) {
    return { error: error ? toFriendlyAddonError(error) : "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_addon.create",
    entityType: "product_addon",
    entityId: addon.id,
    metadata: { productId, name: parsed.data.name, priceDelta: parsed.data.priceDelta },
  });

  revalidateAddonsSurface(customerId, storeId, productId);
  return { error: null };
}

/** store_editor+ (RLS: product_addons_update_editor_tier). productId is never a form field — it's the route param used in the WHERE clause (triple scope: id + store_id + product_id), so an add-on can never be "moved" to a different product. */
export async function updateAddonAction(
  customerId: string,
  storeId: string,
  productId: string,
  addonId: string,
  _prevState: ProductAddonFormState,
  formData: FormData,
): Promise<ProductAddonFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = productAddonFormSchema.safeParse(readProductAddonFormValues(productId, formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validProduct = await assertProductBelongsToStore(productId, storeId);
  if (!validProduct) return { error: INVALID_PRODUCT_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_addons")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      price_delta: parsed.data.priceDelta,
      stock: parsed.data.stock ?? null,
      track_inventory: parsed.data.trackInventory,
      image_url: parsed.data.imageUrl || null,
      is_required: parsed.data.isRequired,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
    })
    // Row-id filter is NEVER trusted alone — store_id AND product_id are
    // always ANDed in, same discipline as every other update in this
    // codebase (products/actions.ts, images/actions.ts,
    // variants/actions.ts). A mismatched productId matches 0 rows rather
    // than erroring — same existing behavior as updateProductImageAction.
    .eq("id", addonId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    return { error: toFriendlyAddonError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_addon.update",
    entityType: "product_addon",
    entityId: addonId,
    metadata: { productId, name: parsed.data.name, priceDelta: parsed.data.priceDelta },
  });

  revalidateAddonsSurface(customerId, storeId, productId);
  return { error: null };
}

/** Bound per-row via `.bind(null, customerId, storeId, productId, addonId, nextActive)` — store_editor+ (deactivating/reactivating is reversible, not the critical "kalıcı silme" tier). Same lighter-weight-toggle shape as products/actions.ts's toggleProductActiveAction. */
export async function setAddonActiveAction(
  customerId: string,
  storeId: string,
  productId: string,
  addonId: string,
  nextActive: boolean,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_addons")
    .update({ is_active: nextActive })
    .eq("id", addonId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    console.error("[addons] failed to toggle addon active state:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_addon.update",
    entityType: "product_addon",
    entityId: addonId,
    metadata: { productId, isActive: nextActive },
  });

  revalidateAddonsSurface(customerId, storeId, productId);
}

/**
 * Permanent delete — store_admin+ ONLY (RLS: product_addons_delete_admin_tier).
 * No further cascade — nothing references product_addons yet (order_items
 * / cart snapshot storage is a future phase's own design, see migration
 * 0022's own header comment: a future order line will store a JSONB
 * SNAPSHOT of the addon's name/price at order time, never a live FK back
 * to this row, so deleting a live add-on can never retroactively corrupt
 * a past order). Single "Sil" click is enough, same as brands/categories/
 * option_groups — no window.confirm() needed.
 */
export async function deleteAddonAction(
  customerId: string,
  storeId: string,
  productId: string,
  addonId: string,
): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_addons")
    .delete()
    .eq("id", addonId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    console.error("[addons] failed to delete addon:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_addon.delete",
    entityType: "product_addon",
    entityId: addonId,
    metadata: { productId },
  });

  revalidateAddonsSurface(customerId, storeId, productId);
}
