"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/lib/validation/product";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { toFriendlyError } from "@/lib/commerce/product-errors";
import type { ProductFormState } from "./form-state";

const INVALID_CATEGORY_MESSAGE = "Geçersiz kategori.";
const INVALID_BRAND_MESSAGE = "Geçersiz marka.";

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

/**
 * FAZ 2B-P1 (admin güçlendirme yol haritası) — Ürün kopyalama.
 * store_editor+ (create ile aynı tier — geri alınabilir, cascade riski
 * yok: kopya kendi bağımsız satırı).
 *
 * Sadece temel ürün alanlarını ve variant_id=null olan (yani ürün
 * geneline ait, belirli bir varyanta özel olmayan) görselleri kopyalar.
 * Varyantlar/ek ürün alanları (option_groups/option_values/
 * product_variants/product_addons) bu ilk sürümde BİLEREK kopyalanmıyor:
 * Taktikalp46'da şu an hiç varyant/addon yok, ve gerçek bir kopyalama
 * orada birden fazla junction tablosuna (variant_option_values dahil)
 * yazmayı gerektirir — çok daha yüksek riskli bir işlem. Gerçek katalog
 * verisiyle ihtiyaç görülürse P1.5 olarak eklenir (bkz.
 * ADMIN_URUN_YONETIMI_ANALIZ_VE_YOL_HARITASI.md).
 *
 * Kopyada bilinçli varsayılanlar (Shopify'ın "Duplicate"ı da aynı
 * mantıkla taslak/pasif bir kopya oluşturuyor):
 *   - slug/sku: ikisi de (store_id, col) üzerinde unique — "-kopya" /
 *     "-KOPYA" son ekiyle benzersizleştirilir; bu da çakışırsa (aynı ürün
 *     birden fazla kez kopyalanmışsa) kısa rastgele bir son ek eklenip
 *     BİR kez daha denenir.
 *   - barcode: NULL'a çekilir — fiziksel bir barkodun iki farklı ürün
 *     satırında görünmesi yanlış olur.
 *   - is_active: false, stock: 0 — admin fiyat/SKU/stoğu gözden geçirip
 *     kendi isteğiyle aktif etmeden müşteri tarafında görünmesin diye.
 */
export async function duplicateProductAction(customerId: string, storeId: string, productId: string): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: source, error: fetchError } = await supabase
    .from("products")
    .select(
      "name, slug, sku, model, short_description, description, category_id, brand_id, price, compare_at_price, track_inventory, sort_order, seo_title, seo_description",
    )
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (fetchError || !source) {
    console.error("[products] duplicate: source product not found:", fetchError?.message);
    return;
  }

  // Narrowed into its own const: `source`'s `!source` null-check above only
  // narrows its type in THIS function's body, not inside the nested
  // insertCopy() closure below (TS doesn't propagate closure-captured
  // narrowing) — `src` carries the already-narrowed, definitely-non-null
  // type into that closure instead.
  const src = source;
  const baseSlug = `${src.slug}-kopya`;
  const baseSku = `${src.sku}-KOPYA`;

  function insertCopy(slug: string, sku: string) {
    return supabase
      .from("products")
      .insert({
        store_id: storeId,
        category_id: src.category_id,
        brand_id: src.brand_id,
        name: `${src.name} (Kopya)`,
        slug,
        sku,
        barcode: null,
        model: src.model,
        short_description: src.short_description,
        description: src.description,
        price: src.price,
        compare_at_price: src.compare_at_price,
        stock: 0,
        track_inventory: src.track_inventory,
        is_active: false,
        sort_order: src.sort_order,
        seo_title: src.seo_title,
        seo_description: src.seo_description,
      })
      .select("id")
      .single();
  }

  let { data: copy, error: insertError } = await insertCopy(baseSlug, baseSku);

  // Aynı ürün birden fazla kez kopyalanmışsa "-kopya"/"-KOPYA" da
  // çakışabilir (23505 unique_violation) — kısa rastgele bir son ekle BİR
  // kez daha dene. İkinci deneme de başarısız olursa (çok düşük ihtimal)
  // aşağıdaki genel hata kontrolüne düşer ve sessizce durur.
  if (insertError?.code === "23505") {
    const suffix = Math.random().toString(36).slice(2, 6);
    ({ data: copy, error: insertError } = await insertCopy(`${baseSlug}-${suffix}`, `${baseSku}-${suffix}`));
  }

  if (insertError || !copy) {
    console.error("[products] duplicate: insert failed:", insertError?.message);
    return;
  }

  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path, alt_text, sort_order, is_primary")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .is("variant_id", null);

  if (images && images.length > 0) {
    const { error: imagesError } = await supabase.from("product_images").insert(
      images.map((image) => ({
        store_id: storeId,
        product_id: copy!.id,
        storage_path: image.storage_path,
        alt_text: image.alt_text,
        sort_order: image.sort_order,
        is_primary: image.is_primary,
      })),
    );
    if (imagesError) {
      // Ürünün kendisi zaten oluşturuldu — görsel kopyalama başarısız olsa
      // bile admin devam edebilsin, sadece logla. Görselleri Görseller
      // sekmesinden manuel ekleyebilir.
      console.error("[products] duplicate: image copy failed:", imagesError.message);
    }
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.create",
    entityType: "product",
    entityId: copy.id,
    metadata: { duplicatedFrom: productId, slug: baseSlug, sku: baseSku },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidateTag(storeProductsTag(storeId), "max");
  redirect(`/dashboard/customers/${customerId}/stores/${storeId}/products/${copy.id}`);
}

const BULK_PRODUCT_ACTIONS = new Set(["activate", "deactivate"]);

/**
 * FAZ 2B-P1 — Ürün listesinde çoklu seçim + toplu aktif/pasif yapma.
 * store_editor+ (toggleProductActiveAction ile aynı tier — reversible).
 *
 * Kalıcı silme BİLEREK bu toplu action'a dahil edilmedi: cascade'li ve
 * geri alınamaz bir işlemi "birden fazla ürünü tek tıkla sil" haline
 * getirmenin riski, tek tek delete-product-button.tsx'in kendi
 * window.confirm()'üyle sınırlı kalmalı.
 *
 * Bound edilmiyor — products/page.tsx'te doğrudan
 * `<form action={bulkUpdateProductsAction.bind(null, customerId, storeId)}>`
 * olarak kullanılıyor; seçili productId'ler ve seçilen işlem FormData
 * üzerinden (checkbox'lar + bir <select>) geliyor.
 */
export async function bulkUpdateProductsAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const productIds = formData.getAll("productIds").map(String).filter(Boolean);
  const bulkAction = String(formData.get("bulkAction") ?? "");

  if (productIds.length === 0 || !BULK_PRODUCT_ACTIONS.has(bulkAction)) {
    return;
  }

  const nextActive = bulkAction === "activate";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: nextActive })
    // Row-id filtresi TEK BAŞINA asla güvenilmez — store_id her zaman
    // AND'lenir, bu dosyadaki her update ile aynı disiplin. `.in()` ile
    // birden fazla id, ama hepsi aynı store_id şartına tabi — başka bir
    // mağazanın ürün id'si buraya sızsa bile hiçbir satırı etkilemez.
    .in("id", productIds)
    .eq("store_id", storeId);

  if (error) {
    console.error("[products] bulk update failed:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.update",
    entityType: "product",
    entityId: null,
    metadata: { bulk: true, bulkAction, productIds, isActive: nextActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products`);
  revalidateTag(storeProductsTag(storeId), "max");
}
