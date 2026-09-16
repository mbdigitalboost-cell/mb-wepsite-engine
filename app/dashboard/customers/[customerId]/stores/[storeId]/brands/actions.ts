"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { brandFormSchema } from "@/lib/validation/brand";
import { storeBrandsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { BrandFormState } from "./form-state";

const DUPLICATE_SLUG_MESSAGE = "Bu slug bu mağazada zaten kullanılıyor.";

/**
 * Postgres unique_violation (23505) on brands_slug_unique (store_id, slug)
 * -> one friendly, specific message instead of the raw constraint-name
 * error Postgres returns. Anything else falls back to the same
 * `Kaydedilemedi: ${error.message}` shape every other action.ts in this
 * codebase already uses (navigation/settings/homepage) — no new error
 * convention invented here.
 */
function toFriendlyError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") return DUPLICATE_SLUG_MESSAGE;
  return `Kaydedilemedi: ${error.message}`;
}

function readBrandFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    // Real checkbox (see brand-form.tsx) — unchecked means the field is
    // simply absent from FormData (`null`), which brandFormSchema's
    // z.coerce.boolean() correctly coerces to `false`. Same approach as
    // content-form.tsx's boolean-kind fields.
    isActive: formData.get("isActive"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
  };
}

/** store_editor+ (RLS: brands_insert_editor_tier). */
export async function createBrandAction(
  customerId: string,
  storeId: string,
  _prevState: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = brandFormSchema.safeParse(readBrandFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: brand, error } = await supabase
    .from("brands")
    .insert({
      // storeId comes ONLY from the route param (bound in brands/page.tsx
      // via .bind(null, customerId, storeId)) — the form never submits a
      // store_id/storeId field (see brand-form.tsx / brandFormSchema).
      store_id: storeId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      logo_url: parsed.data.logoUrl || null,
      is_active: parsed.data.isActive,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: toFriendlyError(error) };
  }
  if (!brand) {
    return { error: "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "brand.create",
    entityType: "brand",
    entityId: brand.id,
    metadata: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/brands`);
  revalidateTag(storeBrandsTag(storeId), "max");
  return { error: null };
}

/** store_editor+ (RLS: brands_update_editor_tier). Also handles the is_active toggle — brandFormSchema always carries isActive, no separate toggle action exists for brands. */
export async function updateBrandAction(
  customerId: string,
  storeId: string,
  brandId: string,
  _prevState: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = brandFormSchema.safeParse(readBrandFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("brands")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      logo_url: parsed.data.logoUrl || null,
      is_active: parsed.data.isActive,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
    })
    // Row-id filter is NEVER trusted alone — store_id is always ANDed in,
    // same discipline as every other update in this codebase (navigation,
    // settings, homepage).
    .eq("id", brandId)
    .eq("store_id", storeId);

  if (error) {
    return { error: toFriendlyError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "brand.update",
    entityType: "brand",
    entityId: brandId,
    metadata: { name: parsed.data.name, slug: parsed.data.slug, isActive: parsed.data.isActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/brands`);
  revalidateTag(storeBrandsTag(storeId), "max");
  return { error: null };
}

/**
 * Permanent delete — store_admin+ ONLY (RLS: brands_delete_admin_tier),
 * same tier as navigation/category permanent delete. Safe by schema
 * design: products.brand_id -> brands has `on delete set null (brand_id)`
 * (migration 0017's composite FK), never RESTRICT/CASCADE — so deleting a
 * brand can never fail because products still reference it; those
 * products simply lose their brand_id (become "brandless"), which is the
 * intended, already-verified (P0 hardening turn) behavior.
 */
export async function deleteBrandAction(customerId: string, storeId: string, brandId: string): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("brands").delete().eq("id", brandId).eq("store_id", storeId);
  if (error) {
    console.error("[brands] failed to delete brand:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "brand.delete",
    entityType: "brand",
    entityId: brandId,
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/brands`);
  revalidateTag(storeBrandsTag(storeId), "max");
}
