"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { brandFormSchema } from "@/lib/validation/brand";
import { storeBrandsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { uploadStoreBrandingAsset } from "@/lib/commerce/upload-store-branding-asset";
import type { BrandFormState, BrandLogoFormState, BrandModelFormState } from "./form-state";

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

/**
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C —
 * "Markalar ve Modeller" ekranı. Logo yükleme SADECE store_admin+ —
 * brands_update_editor_tier (RLS) kendi başına editor+'a izin verse de,
 * storage.objects'in store-branding bucket RLS'i (migration 0035)
 * SADECE is_store_admin_member'a yazma izni veriyor. Bu action'ı
 * BİLEREK requireStoreAdminAccess ile koruyoruz — editor bir dosya
 * seçip gönderirse app katmanında net bir "yetkin yok" mesajı alsın,
 * kafa karıştıran bir Storage RLS hatasına düşmesin.
 */
export async function uploadBrandLogoAction(
  customerId: string,
  storeId: string,
  brandId: string,
  _prevState: BrandLogoFormState,
  formData: FormData,
): Promise<BrandLogoFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  const file = formData.get("logoFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }

  const uploadResult = await uploadStoreBrandingAsset({ storeId, assetType: `brands/${brandId}`, file });
  if (uploadResult.error) return { error: uploadResult.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("brands")
    .update({ logo_url: uploadResult.publicUrl })
    .eq("id", brandId)
    .eq("store_id", storeId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "brand.update",
    entityType: "brand",
    entityId: brandId,
    metadata: { logoUploaded: true },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/brands`);
  revalidateTag(storeBrandsTag(storeId), "max");
  return { error: null };
}

/** Model ekleme — store_editor+ (RLS: brand_models_insert_editor_tier). Yeni model listenin sonuna eklenir (mevcut en büyük sort_order + 1). */
export async function addBrandModelAction(
  customerId: string,
  storeId: string,
  brandId: string,
  _prevState: BrandModelFormState,
  formData: FormData,
): Promise<BrandModelFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Model adı zorunlu." };

  const supabase = await createSupabaseServerClient();

  const { data: last } = await supabase
    .from("brand_models")
    .select("sort_order")
    .eq("store_id", storeId)
    .eq("brand_id", brandId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("brand_models")
    .insert({ store_id: storeId, brand_id: brandId, name, sort_order: (last?.sort_order ?? -1) + 1 });

  if (error) {
    // unique_violation (brand_models_brand_id_name_unique_idx, case-insensitive).
    if (error.code === "23505") return { error: "Bu model bu markada zaten var." };
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "brand.update",
    entityType: "brand",
    entityId: brandId,
    metadata: { modelAdded: name },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/brands`);
  revalidateTag(storeBrandsTag(storeId), "max");
  return { error: null };
}

/** Model silme — store_admin+ (RLS: brand_models_delete_admin_tier, brands'in kendi delete tier'ıyla TUTARLI). */
export async function deleteBrandModelAction(
  customerId: string,
  storeId: string,
  brandId: string,
  modelId: string,
): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("brand_models").delete().eq("id", modelId).eq("store_id", storeId);
  if (error) {
    console.error("[brands] failed to delete brand model:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "brand.update",
    entityType: "brand",
    entityId: brandId,
    metadata: { modelDeleted: modelId },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/brands`);
  revalidateTag(storeBrandsTag(storeId), "max");
}

/**
 * Model sıralama — devir metninin kendi "basit yukarı/aşağı ok" tercihi
 * (sürükle-bırak YAZILMADI, iki seçenekten daha basit/az riskli olanı).
 * store_editor+ (RLS: brand_models_update_editor_tier). Komşu modelle
 * sort_order'ı TAKAS eder — yeni bir "boşluk aç" mantığı gerektirmez.
 *
 * ACİL DÜZELTME — `direction` BİLEREK `modelId`'den ÖNCE geliyor (çağrı
 * sezgisel sırayla ters duruyor olabilir, ama bu kasıtlı): brands/page.tsx
 * iki yöne ("up"/"down") AYRI, SADECE `.bind()` ile oluşturulmuş birer
 * fonksiyon üretmek zorunda — bu server action'ı SARAN yeni bir closure
 * (`(modelId) => moveBrandModelAction(..., modelId, direction)` gibi)
 * React Server Components'in Flight serileştiricisi tarafından artık bir
 * server action referansı olarak TANINMIYOR ("Functions cannot be passed
 * directly to Client Components..." — canlıda BrandModelsPanel'i (use
 * client) kıran gerçek hata buydu). `.bind(null, customerId, storeId,
 * brandId, "up")` gibi SIRALI bind'ler ancak SABİTLENEN parametreler
 * baştan başlayıp ARAYA boşluk bırakmadan ilerlerse çalışır — bu yüzden
 * tek değişken olan `modelId` en SONA alındı, `direction` öne.
 */
export async function moveBrandModelAction(
  customerId: string,
  storeId: string,
  brandId: string,
  direction: "up" | "down",
  modelId: string,
): Promise<void> {
  await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: models } = await supabase
    .from("brand_models")
    .select("id, sort_order")
    .eq("store_id", storeId)
    .eq("brand_id", brandId)
    .order("sort_order", { ascending: true });

  if (!models) return;

  const index = models.findIndex((m) => m.id === modelId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= models.length) return;

  const current = models[index];
  const neighbor = models[swapIndex];

  await Promise.all([
    supabase.from("brand_models").update({ sort_order: neighbor.sort_order }).eq("id", current.id).eq("store_id", storeId),
    supabase.from("brand_models").update({ sort_order: current.sort_order }).eq("id", neighbor.id).eq("store_id", storeId),
  ]);

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/brands`);
  revalidateTag(storeBrandsTag(storeId), "max");
}
