"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { optionGroupFormSchema } from "@/lib/validation/option-group";
import { optionValueFormSchema } from "@/lib/validation/option-value";
import { productVariantFormSchema } from "@/lib/validation/product-variant";
import { variantOptionValueAssignmentSchema } from "@/lib/validation/variant-option-value";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type {
  OptionGroupFormState,
  OptionValueFormState,
  ProductVariantFormState,
  VariantOptionAssignmentFormState,
} from "./form-state";

const INVALID_PRODUCT_MESSAGE = "Geçersiz ürün.";
const INVALID_OPTION_GROUP_MESSAGE = "Geçersiz seçenek grubu.";
const INVALID_VARIANT_MESSAGE = "Geçersiz varyant.";
const INVALID_OPTION_VALUE_MESSAGE = "Geçersiz seçenek değeri.";
const DUPLICATE_OPTION_GROUP_MESSAGE = "Aynı seçenek grubundan yalnızca bir değer seçilebilir.";

function revalidateVariantsSurface(customerId: string, storeId: string, productId: string) {
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}/variants`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
}

/** The DB composite FK (product_id, store_id) -> products(id, store_id) is the real, final guard — this pre-SELECT is only here for a cleaner, field-specific error message, same technique as products/actions.ts and images/actions.ts. */
async function assertProductBelongsToStore(productId: string, storeId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("products").select("id").eq("id", productId).eq("store_id", storeId).maybeSingle();
  return Boolean(data);
}

/** option_values.optionGroupId must belong to THIS product (not just this store) — option_groups is itself product-scoped, so this single check covers both same-store AND same-product ownership in one query. */
async function assertOptionGroupBelongsToProduct(
  optionGroupId: string,
  productId: string,
  storeId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("option_groups")
    .select("id")
    .eq("id", optionGroupId)
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .maybeSingle();
  return Boolean(data);
}

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

/**
 * The DB composite FK (option_value_id, store_id) -> option_values(id,
 * store_id) already guarantees every id in `optionValueIds` belongs to
 * THIS store — what it does NOT guarantee is that it belongs to THIS
 * product (an option_value's option_group could belong to a completely
 * different product in the same store). This is exactly the "Ürün A'nın
 * option value'su Ürün B'nin variantına atanamamalı" risk called out in
 * the FAZ 2C-2 spec — two discrete queries (not a single PostgREST
 * embedded join, to keep the same plain `.select().eq()` style every
 * other ownership check in this codebase uses):
 *   1) every id must exist as an option_value row in this store
 *   2) every one of THOSE rows' option_group_id must belong to an
 *      option_group that itself belongs to THIS product
 * Also returns each value's option_group_id so the caller can enforce
 * the "at most one value per option_group" business rule — migration
 * 0018's own header comment states this is deliberately NOT DB-enforced
 * (would need a trigger), so this application layer is authoritative.
 */
async function loadOwnedOptionValueGroups(
  optionValueIds: string[],
  productId: string,
  storeId: string,
): Promise<Map<string, string> | null> {
  const supabase = await createSupabaseServerClient();

  const { data: values } = await supabase
    .from("option_values")
    .select("id, option_group_id")
    .in("id", optionValueIds)
    .eq("store_id", storeId);

  if (!values || values.length !== optionValueIds.length) return null;

  const groupIds = [...new Set(values.map((v) => v.option_group_id))];
  const { data: groups } = await supabase
    .from("option_groups")
    .select("id")
    .in("id", groupIds)
    .eq("product_id", productId)
    .eq("store_id", storeId);

  if (!groups || groups.length !== groupIds.length) return null;

  return new Map(values.map((v) => [v.id, v.option_group_id]));
}

// =============================================================================
// OPTION GROUPS
// =============================================================================

function toFriendlyOptionGroupError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") return "Bu üründe bu isimde bir seçenek grubu zaten var.";
  return `Kaydedilemedi: ${error.message}`;
}

function readOptionGroupFormValues(productId: string, formData: FormData) {
  return {
    productId,
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") ?? 0,
  };
}

/** store_editor+ (RLS: option_groups_insert_editor_tier). */
export async function createOptionGroupAction(
  customerId: string,
  storeId: string,
  productId: string,
  _prevState: OptionGroupFormState,
  formData: FormData,
): Promise<OptionGroupFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = optionGroupFormSchema.safeParse(readOptionGroupFormValues(productId, formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validProduct = await assertProductBelongsToStore(productId, storeId);
  if (!validProduct) return { error: INVALID_PRODUCT_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { data: optionGroup, error } = await supabase
    .from("option_groups")
    .insert({
      store_id: storeId,
      product_id: productId,
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error || !optionGroup) {
    return { error: error ? toFriendlyOptionGroupError(error) : "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "option_group.create",
    entityType: "option_group",
    entityId: optionGroup.id,
    metadata: { productId, name: parsed.data.name },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
  return { error: null };
}

/** store_editor+ (RLS: option_groups_update_editor_tier). */
export async function updateOptionGroupAction(
  customerId: string,
  storeId: string,
  productId: string,
  optionGroupId: string,
  _prevState: OptionGroupFormState,
  formData: FormData,
): Promise<OptionGroupFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = optionGroupFormSchema.safeParse(readOptionGroupFormValues(productId, formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validProduct = await assertProductBelongsToStore(productId, storeId);
  if (!validProduct) return { error: INVALID_PRODUCT_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("option_groups")
    .update({ name: parsed.data.name, sort_order: parsed.data.sortOrder })
    // Row-id filter is NEVER trusted alone — store_id AND product_id are
    // always ANDed in (triple scope), same discipline as every other
    // update in this codebase, tightened further here since this route is
    // nested under a specific productId — a mismatched productId simply
    // matches 0 rows rather than erroring (same behavior as
    // updateProductImageAction elsewhere in this codebase).
    .eq("id", optionGroupId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    return { error: toFriendlyOptionGroupError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "option_group.update",
    entityType: "option_group",
    entityId: optionGroupId,
    metadata: { productId, name: parsed.data.name },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
  return { error: null };
}

/** Permanent delete — store_admin+ ONLY (RLS: option_groups_delete_admin_tier). Cascades to option_values (migration 0018, ON DELETE CASCADE). */
export async function deleteOptionGroupAction(
  customerId: string,
  storeId: string,
  productId: string,
  optionGroupId: string,
): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("option_groups")
    .delete()
    .eq("id", optionGroupId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    console.error("[variants] failed to delete option group:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "option_group.delete",
    entityType: "option_group",
    entityId: optionGroupId,
    metadata: { productId },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
}

// =============================================================================
// OPTION VALUES
// =============================================================================

function toFriendlyOptionValueError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") return "Bu seçenek grubunda bu değer zaten var.";
  // variant_option_values_option_value_id_store_id_fkey is ON DELETE
  // RESTRICT (migration 0018's deliberate asymmetry) — a value still
  // attached to a live variant cannot be deleted.
  if (error.code === "23503") return "Bu değer hâlâ bir varyant tarafından kullanılıyor, önce o varyantı güncelleyin.";
  return `Kaydedilemedi: ${error.message}`;
}

function readOptionValueFormValues(formData: FormData) {
  return {
    optionGroupId: formData.get("optionGroupId"),
    value: formData.get("value"),
    sortOrder: formData.get("sortOrder") ?? 0,
  };
}

/** store_editor+ (RLS: option_values_insert_editor_tier). optionGroupId must belong to THIS product (not just this store) — see assertOptionGroupBelongsToProduct. */
export async function createOptionValueAction(
  customerId: string,
  storeId: string,
  productId: string,
  _prevState: OptionValueFormState,
  formData: FormData,
): Promise<OptionValueFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = optionValueFormSchema.safeParse(readOptionValueFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validGroup = await assertOptionGroupBelongsToProduct(parsed.data.optionGroupId, productId, storeId);
  if (!validGroup) return { error: INVALID_OPTION_GROUP_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { data: optionValue, error } = await supabase
    .from("option_values")
    .insert({
      store_id: storeId,
      option_group_id: parsed.data.optionGroupId,
      value: parsed.data.value,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error || !optionValue) {
    return { error: error ? toFriendlyOptionValueError(error) : "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "option_value.create",
    entityType: "option_value",
    entityId: optionValue.id,
    metadata: { productId, optionGroupId: parsed.data.optionGroupId, value: parsed.data.value },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
  return { error: null };
}

/** store_editor+ (RLS: option_values_update_editor_tier). Moving a value to a different optionGroupId is allowed only if that group ALSO belongs to this product. */
export async function updateOptionValueAction(
  customerId: string,
  storeId: string,
  productId: string,
  optionValueId: string,
  _prevState: OptionValueFormState,
  formData: FormData,
): Promise<OptionValueFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = optionValueFormSchema.safeParse(readOptionValueFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validGroup = await assertOptionGroupBelongsToProduct(parsed.data.optionGroupId, productId, storeId);
  if (!validGroup) return { error: INVALID_OPTION_GROUP_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("option_values")
    .update({ option_group_id: parsed.data.optionGroupId, value: parsed.data.value, sort_order: parsed.data.sortOrder })
    .eq("id", optionValueId)
    .eq("store_id", storeId);

  if (error) {
    return { error: toFriendlyOptionValueError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "option_value.update",
    entityType: "option_value",
    entityId: optionValueId,
    metadata: { productId, optionGroupId: parsed.data.optionGroupId, value: parsed.data.value },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
  return { error: null };
}

/**
 * Permanent delete — store_admin+ ONLY (RLS: option_values_delete_admin_tier).
 * Bound per-row via `.bind(null, customerId, storeId, productId,
 * optionGroupId, optionValueId)` — optionGroupId is required here (unlike
 * a simple id+store_id delete elsewhere) because option_values has no
 * product_id column of its own; verifying "this value's group belongs to
 * THIS product" needs the group id up front, same reasoning as
 * assertOptionGroupBelongsToProduct above.
 */
export async function deleteOptionValueAction(
  customerId: string,
  storeId: string,
  productId: string,
  optionGroupId: string,
  optionValueId: string,
): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const validGroup = await assertOptionGroupBelongsToProduct(optionGroupId, productId, storeId);
  if (!validGroup) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("option_values")
    .delete()
    .eq("id", optionValueId)
    .eq("store_id", storeId)
    .eq("option_group_id", optionGroupId);

  if (error) {
    // Most commonly 23503 (RESTRICT) — still referenced by a live variant.
    console.error("[variants] failed to delete option value:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "option_value.delete",
    entityType: "option_value",
    entityId: optionValueId,
    metadata: { productId, optionGroupId },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
}

// =============================================================================
// PRODUCT VARIANTS
// =============================================================================

function toFriendlyVariantError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") return "Bu SKU bu mağazada zaten kullanılıyor.";
  return `Kaydedilemedi: ${error.message}`;
}

function readProductVariantFormValues(productId: string, formData: FormData) {
  return {
    productId,
    sku: formData.get("sku"),
    name: formData.get("name"),
    // Empty-string -> undefined, same normalization products/actions.ts
    // already applies to compareAtPrice: a blank price field means
    // "inherit the parent product's price" (migration 0018's own nullable
    // rationale), NOT "price = 0" — z.coerce.number() would otherwise
    // silently coerce "" to 0.
    price: formData.get("price") || undefined,
    compareAtPrice: formData.get("compareAtPrice") || undefined,
    stock: formData.get("stock") ?? 0,
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder") ?? 0,
  };
}

/** store_editor+ (RLS: product_variants_insert_editor_tier). */
export async function createProductVariantAction(
  customerId: string,
  storeId: string,
  productId: string,
  _prevState: ProductVariantFormState,
  formData: FormData,
): Promise<ProductVariantFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = productVariantFormSchema.safeParse(readProductVariantFormValues(productId, formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validProduct = await assertProductBelongsToStore(productId, storeId);
  if (!validProduct) return { error: INVALID_PRODUCT_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { data: variant, error } = await supabase
    .from("product_variants")
    .insert({
      store_id: storeId,
      product_id: productId,
      sku: parsed.data.sku,
      name: parsed.data.name,
      price: parsed.data.price ?? null,
      compare_at_price: parsed.data.compareAtPrice ?? null,
      stock: parsed.data.stock,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error || !variant) {
    return { error: error ? toFriendlyVariantError(error) : "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_variant.create",
    entityType: "product_variant",
    entityId: variant.id,
    metadata: { productId, sku: parsed.data.sku, name: parsed.data.name },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
  return { error: null };
}

/** store_editor+ (RLS: product_variants_update_editor_tier). productId is never a form field — it's the route param used in the WHERE clause, so a variant can never be "moved" to a different product. */
export async function updateProductVariantAction(
  customerId: string,
  storeId: string,
  productId: string,
  variantId: string,
  _prevState: ProductVariantFormState,
  formData: FormData,
): Promise<ProductVariantFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = productVariantFormSchema.safeParse(readProductVariantFormValues(productId, formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validVariant = await assertVariantBelongsToProduct(variantId, productId, storeId);
  if (!validVariant) return { error: INVALID_VARIANT_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .update({
      sku: parsed.data.sku,
      name: parsed.data.name,
      price: parsed.data.price ?? null,
      compare_at_price: parsed.data.compareAtPrice ?? null,
      stock: parsed.data.stock,
      is_active: parsed.data.isActive,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", variantId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    return { error: toFriendlyVariantError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_variant.update",
    entityType: "product_variant",
    entityId: variantId,
    metadata: { productId, sku: parsed.data.sku, isActive: parsed.data.isActive },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
  return { error: null };
}

/**
 * Permanent delete — store_admin+ ONLY (RLS: product_variants_delete_admin_tier).
 * Cascades to variant_option_values (CASCADE) and sets product_images.variant_id
 * to NULL (migration 0019, ON DELETE SET NULL (variant_id)) — a deleted
 * variant's photos revert to plain product-level images rather than being
 * destroyed.
 */
export async function deleteProductVariantAction(
  customerId: string,
  storeId: string,
  productId: string,
  variantId: string,
): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    console.error("[variants] failed to delete product variant:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product_variant.delete",
    entityType: "product_variant",
    entityId: variantId,
    metadata: { productId },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
}

// =============================================================================
// VARIANT OPTION ASSIGNMENT
// =============================================================================

/**
 * store_editor+ (RLS: variant_option_values_insert_editor_tier +
 * _delete_admin... NO — delete side of this replace is also editor-tier,
 * since removing/replacing a variant's own option-value links is a
 * reversible content edit, not the critical "kalıcı silme" tier; only
 * option_groups/option_values/product_variants/product_addons
 * themselves reserve delete for store_admin+).
 *
 * "Assign" AND "replace" in one action: the full desired set of
 * optionValueIds for this variant is submitted every time (a multi-select
 * form, mirroring variantOptionValueAssignmentSchema's own doc comment).
 * Supabase-js has no multi-statement transaction here, so this is a
 * delete-then-insert pair — acceptable because both statements are scoped
 * to (variant_id, store_id) and RLS-gated identically; a failure between
 * the two simply leaves the variant with NO option values assigned rather
 * than a torn cross-variant state.
 */
export async function setVariantOptionValuesAction(
  customerId: string,
  storeId: string,
  productId: string,
  variantId: string,
  _prevState: VariantOptionAssignmentFormState,
  formData: FormData,
): Promise<VariantOptionAssignmentFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const optionValueIds = formData.getAll("optionValueIds").filter((v): v is string => typeof v === "string");
  const parsed = variantOptionValueAssignmentSchema.safeParse({ variantId, optionValueIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const validVariant = await assertVariantBelongsToProduct(variantId, productId, storeId);
  if (!validVariant) return { error: INVALID_VARIANT_MESSAGE };

  const groupByValueId = await loadOwnedOptionValueGroups(parsed.data.optionValueIds, productId, storeId);
  if (!groupByValueId) return { error: INVALID_OPTION_VALUE_MESSAGE };

  // Application-layer authoritative check — migration 0018's own header
  // comment states this is DELIBERATELY NOT DB-enforced (would need a
  // trigger): a variant may not select two values from the same
  // option_group (e.g. both "Siyah" AND "Beyaz" under "Renk").
  const seenGroups = new Set<string>();
  for (const groupId of groupByValueId.values()) {
    if (seenGroups.has(groupId)) return { error: DUPLICATE_OPTION_GROUP_MESSAGE };
    seenGroups.add(groupId);
  }

  const supabase = await createSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("variant_option_values")
    .delete()
    .eq("variant_id", variantId)
    .eq("store_id", storeId);

  if (deleteError) {
    return { error: `Kaydedilemedi: ${deleteError.message}` };
  }

  const { error: insertError } = await supabase.from("variant_option_values").insert(
    parsed.data.optionValueIds.map((optionValueId) => ({
      variant_id: variantId,
      option_value_id: optionValueId,
      store_id: storeId,
    })),
  );

  if (insertError) {
    return { error: `Kaydedilemedi: ${insertError.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "variant_option_value.set",
    entityType: "product_variant",
    entityId: variantId,
    metadata: { productId, optionValueIds: parsed.data.optionValueIds },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
  return { error: null };
}

/**
 * Bound per-row via `.bind(null, customerId, storeId, productId, variantId,
 * optionValueId)` — store_editor+ (removing a single assignment is
 * reversible, same tier as the full replace above).
 *
 * FAZ 2C-2.1 hardening: this action always received `productId` (the
 * route already binds it), but — unlike setVariantOptionValuesAction
 * right above it — never actually checked that `variantId` belongs to
 * it. The DELETE itself is scoped to (variant_id, store_id), which is
 * enough for tenant (cross-store) isolation via RLS, but NOT for
 * cross-product isolation within the same store: a store_editor viewing
 * Product A's variants page could otherwise remove an option-value link
 * belonging to a variant of Product B in the same store, just by
 * guessing/observing its id. assertVariantBelongsToProduct closes that
 * gap the same way every other productId-bearing action in this file
 * already does.
 */
export async function removeVariantOptionValueAction(
  customerId: string,
  storeId: string,
  productId: string,
  variantId: string,
  optionValueId: string,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const validVariant = await assertVariantBelongsToProduct(variantId, productId, storeId);
  if (!validVariant) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("variant_option_values")
    .delete()
    .eq("variant_id", variantId)
    .eq("option_value_id", optionValueId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[variants] failed to remove variant option value:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "variant_option_value.remove",
    entityType: "product_variant",
    entityId: variantId,
    metadata: { productId, optionValueId },
  });

  revalidateVariantsSurface(customerId, storeId, productId);
}
