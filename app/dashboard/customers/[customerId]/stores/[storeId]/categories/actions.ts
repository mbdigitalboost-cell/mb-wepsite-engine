"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categoryFormSchema } from "@/lib/validation/category";
import { storeCategoriesTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { CategoryFormState } from "./form-state";

const DUPLICATE_SLUG_MESSAGE = "Bu slug bu mağazada zaten kullanılıyor.";
const INVALID_PARENT_MESSAGE = "Geçersiz üst kategori.";

/**
 * Postgres unique_violation (23505) on categories_slug_unique
 * (store_id, slug) -> one friendly, specific message instead of the raw
 * constraint-name error Postgres returns. Same shape as brands/actions.ts.
 */
function toFriendlyError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") return DUPLICATE_SLUG_MESSAGE;
  return `Kaydedilemedi: ${error.message}`;
}

function readCategoryFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    parentId: formData.get("parentId"),
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
  };
}

/**
 * migration 0016's own header comment: parent_id'nin AYNI store'a ait
 * olduğu bir composite self-FK ile DB seviyesinde garanti edilmiyor
 * (Postgres'te bir tablonun kendi kendine composite self-FK'si pratik
 * değil) — bu yüzden application-level kontrol burada yapılıyor. RLS zaten
 * store_id bazlı okuma/yazmayı kısıtlıyor; bu sadece "yanlış store'un
 * kategorisini parent seçme" senaryosuna karşı ek bir katman.
 */
async function assertParentBelongsToStore(
  parentId: string,
  storeId: string,
  excludeCategoryId?: string,
): Promise<boolean> {
  if (excludeCategoryId && parentId === excludeCategoryId) return false;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id").eq("id", parentId).eq("store_id", storeId).maybeSingle();
  return Boolean(data);
}

/** store_editor+ (RLS: categories_insert_editor_tier). */
export async function createCategoryAction(
  customerId: string,
  storeId: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = categoryFormSchema.safeParse(readCategoryFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  if (parsed.data.parentId) {
    const validParent = await assertParentBelongsToStore(parsed.data.parentId, storeId);
    if (!validParent) return { error: INVALID_PARENT_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      // storeId comes ONLY from the route param (bound in
      // categories/page.tsx via .bind(null, customerId, storeId)) — the
      // form never submits a store_id/storeId field.
      store_id: storeId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      parent_id: parsed.data.parentId || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: toFriendlyError(error) };
  }
  if (!category) {
    return { error: "Kaydedilemedi: bilinmeyen hata" };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "category.create",
    entityType: "category",
    entityId: category.id,
    metadata: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/categories`);
  revalidateTag(storeCategoriesTag(storeId), "max");
  return { error: null };
}

/** store_editor+ (RLS: categories_update_editor_tier). Also handles the is_active toggle — categoryFormSchema always carries isActive, no separate toggle action exists for categories. */
export async function updateCategoryAction(
  customerId: string,
  storeId: string,
  categoryId: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = categoryFormSchema.safeParse(readCategoryFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  if (parsed.data.parentId) {
    const validParent = await assertParentBelongsToStore(parsed.data.parentId, storeId, categoryId);
    if (!validParent) return { error: INVALID_PARENT_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      parent_id: parsed.data.parentId || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
    })
    // Row-id filter is NEVER trusted alone — store_id is always ANDed in,
    // same discipline as every other update in this codebase.
    .eq("id", categoryId)
    .eq("store_id", storeId);

  if (error) {
    return { error: toFriendlyError(error) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "category.update",
    entityType: "category",
    entityId: categoryId,
    metadata: { name: parsed.data.name, slug: parsed.data.slug, isActive: parsed.data.isActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/categories`);
  revalidateTag(storeCategoriesTag(storeId), "max");
  return { error: null };
}

/**
 * Permanent delete — store_admin+ ONLY (RLS: categories_delete_admin_tier),
 * same tier as navigation/brand permanent delete. Safe by schema design:
 * products.category_id -> categories has `on delete set null (category_id)`
 * (migration 0017's composite FK) and categories.parent_id -> categories
 * has `on delete set null` (migration 0016) — deleting a category can
 * never fail because products/child-categories still reference it; they
 * simply lose that reference.
 */
export async function deleteCategoryAction(customerId: string, storeId: string, categoryId: string): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId).eq("store_id", storeId);
  if (error) {
    console.error("[categories] failed to delete category:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "category.delete",
    entityType: "category",
    entityId: categoryId,
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/categories`);
  revalidateTag(storeCategoriesTag(storeId), "max");
}
