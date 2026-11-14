"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { CategoryProductsFormState } from "./form-state";

/**
 * Faz 27 — kategori ekranından ürün ekleme/çıkarma (product_categories,
 * migration 0043). store_editor+ ve her sorguda store_id. Buradan eklenen
 * bağ ANA kategori yapmaz (is_primary=false) — yalnız ürünün hiç kategorisi
 * yoksa trigger onu ana yapar (category_id aynası boş kalmasın). Mükerrer
 * ekleme: PK (product_id, category_id) + on conflict do nothing.
 */

function revalidateSurfaces(customerId: string, storeId: string, categoryId: string) {
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/categories/${categoryId}`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/categories`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidateTag(storeProductsTag(storeId), "max");
}

export async function addProductsToCategoryAction(
  customerId: string,
  storeId: string,
  categoryId: string,
  _prevState: CategoryProductsFormState,
  formData: FormData,
): Promise<CategoryProductsFormState> {
  const { user } = await requireStoreEditorAccess(storeId);
  const productIds = [...new Set(formData.getAll("productIds").map((v) => String(v).trim()).filter(Boolean))];
  if (productIds.length === 0) return { error: "Eklemek için en az bir ürün seçin.", success: null };

  const supabase = await createSupabaseServerClient();
  const { data: category } = await supabase.from("categories").select("id").eq("id", categoryId).eq("store_id", storeId).maybeSingle();
  if (!category) return { error: "Geçersiz kategori.", success: null };

  const { data: validProducts } = await supabase.from("products").select("id").eq("store_id", storeId).in("id", productIds);
  const validIds = (validProducts ?? []).map((row) => row.id);
  if (validIds.length !== productIds.length) return { error: "Seçilen ürünlerden biri bu mağazaya ait değil.", success: null };

  const { data: existing } = await supabase
    .from("product_categories")
    .select("product_id")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .in("product_id", validIds);
  const existingIds = new Set((existing ?? []).map((row) => row.product_id));
  const toInsert = validIds.filter((id) => !existingIds.has(id));
  if (toInsert.length === 0) return { error: null, success: "Seçilen ürünler zaten bu kategoride." };

  const { error } = await supabase
    .from("product_categories")
    .upsert(
      toInsert.map((productId) => ({ product_id: productId, category_id: categoryId, store_id: storeId, is_primary: false })),
      { onConflict: "product_id,category_id", ignoreDuplicates: true },
    );
  if (error) return { error: `Eklenemedi: ${error.message}`, success: null };

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.categories_update",
    entityType: "category",
    entityId: categoryId,
    metadata: { source: "category_screen", added: toInsert.length, skippedExisting: existingIds.size, productIds: toInsert },
  });

  revalidateSurfaces(customerId, storeId, categoryId);
  return { error: null, success: `${toInsert.length} ürün eklendi${existingIds.size > 0 ? `, ${existingIds.size} zaten ekliydi` : ""}.` };
}

/** Bağı siler. Ana kategori çıkarılırsa trigger kalanlardan en eskisini ana yapar; hiç kalmazsa category_id NULL olur. */
export async function removeProductFromCategoryAction(
  customerId: string,
  storeId: string,
  categoryId: string,
  productId: string,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);
  const supabase = await createSupabaseServerClient();
  const { data: removed } = await supabase
    .from("product_categories")
    .delete()
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .eq("product_id", productId)
    .select("is_primary");
  if (!removed || removed.length === 0) return;

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.categories_update",
    entityType: "category",
    entityId: categoryId,
    metadata: { source: "category_screen", removed: 1, productId, wasPrimary: removed[0].is_primary },
  });

  revalidateSurfaces(customerId, storeId, categoryId);
}
