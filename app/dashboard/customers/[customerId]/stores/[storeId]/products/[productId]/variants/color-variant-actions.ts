"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeProductsTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { comboKey, formatVariantLabel, variantSkuSuffix } from "@/lib/commerce/variant-label";

/**
 * Faz 25 — "Renk / Varyant / Görsel bağlama" paneli (variant-color-panel.tsx)
 * için action'lar. BİLEREK ayrı dosya: variants/actions.ts'te kullanıcının
 * kararını bekleyen commit edilmemiş bir değişiklik var, ona karışılmıyor.
 *
 * Yetki ve kiracı sınırı mevcut ürün ekranlarıyla aynı: store_editor+
 * (requireStoreEditorAccess), cookie-bound client → RLS editor-tier
 * policy'leri gerçek kapı; her sorguda ayrıca store_id + product_id.
 * Silme bu dosyada yok (mevcut store_admin+ deleteProductVariantAction kullanılır).
 */

import type { ColorVariantFormState } from "./color-variant-form-state";

const MAX_COMBINATIONS = 50;

function revalidateProductSurface(customerId: string, storeId: string, productId: string) {
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/products/${productId}`);
  revalidateTag(storeProductsTag(storeId), "max");
}

interface ComboValue {
  id: string;
  value: string;
}

/** Tüm seçenek gruplarının kartezyen çarpımı; anahtar = sıralı value id'leri. */
function buildCombinations(groups: Array<{ values: ComboValue[] }>): ComboValue[][] {
  return groups.reduce<ComboValue[][]>(
    (acc, group) => acc.flatMap((combo) => group.values.map((value) => [...combo, value])),
    [[]],
  );
}

/**
 * Seçenek grubu olup varyantı eksik kombinasyonlar için product_variants +
 * variant_option_values üretir. Fiyat/karşılaştırma fiyatı üründen
 * kopyalanır (devir metni), SKU = ürün SKU'su + kısa ek (0003-COY).
 * STOK ZORUNLU ve admin'den gelir: ürünün mevcut stoğunu renklere bölmek
 * yanlış olurdu, varsayılan değer verilmez.
 */
export async function createMissingVariantsAction(
  customerId: string,
  storeId: string,
  productId: string,
  _prevState: ColorVariantFormState,
  formData: FormData,
): Promise<ColorVariantFormState> {
  const { user } = await requireStoreEditorAccess(storeId);
  const supabase = await createSupabaseServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, sku, price, compare_at_price")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!product) return { error: "Geçersiz ürün.", success: null };

  const { data: groups } = await supabase
    .from("option_groups")
    .select("id, sort_order")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
  const groupIds = (groups ?? []).map((g) => g.id);
  if (groupIds.length === 0) return { error: "Bu üründe seçenek grubu yok.", success: null };

  const { data: values } = await supabase
    .from("option_values")
    .select("id, option_group_id, value, sort_order")
    .in("option_group_id", groupIds)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  const groupedValues = groupIds.map((groupId) => ({
    values: (values ?? []).filter((v) => v.option_group_id === groupId).map((v) => ({ id: v.id, value: v.value })),
  }));
  if (groupedValues.some((g) => g.values.length === 0)) {
    return { error: "Her seçenek grubunda en az bir değer olmalı.", success: null };
  }

  const combinations = buildCombinations(groupedValues);
  if (combinations.length > MAX_COMBINATIONS) {
    return { error: `Çok fazla kombinasyon (${combinations.length}). Varyantları tek tek ekleyin.`, success: null };
  }

  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("store_id", storeId);
  const existingIds = (existingVariants ?? []).map((v) => v.id);
  const { data: links } =
    existingIds.length > 0
      ? await supabase.from("variant_option_values").select("variant_id, option_value_id").in("variant_id", existingIds).eq("store_id", storeId)
      : { data: [] as { variant_id: string; option_value_id: string }[] };
  const idsByVariant = new Map<string, string[]>();
  for (const link of links ?? []) idsByVariant.set(link.variant_id, [...(idsByVariant.get(link.variant_id) ?? []), link.option_value_id]);
  const existingKeys = new Set([...idsByVariant.values()].map(comboKey));

  const missing = combinations.filter((combo) => !existingKeys.has(comboKey(combo.map((v) => v.id))));
  if (missing.length === 0) return { error: null, success: "Tüm kombinasyonların varyantı zaten var." };

  const stocks = new Map<string, number>();
  for (const combo of missing) {
    const key = comboKey(combo.map((v) => v.id));
    const raw = String(formData.get(`stock_${key}`) ?? "").trim();
    const stock = Number(raw);
    if (raw === "" || !Number.isInteger(stock) || stock < 0) {
      return { error: `"${formatVariantLabel(combo.map((v) => v.value))}" için stok adedini girin (0 veya üstü tam sayı).`, success: null };
    }
    stocks.set(key, stock);
  }

  const { data: storeSkus } = await supabase.from("product_variants").select("sku").eq("store_id", storeId).not("sku", "is", null);
  const usedSkus = new Set((storeSkus ?? []).map((row) => row.sku as string));
  const baseSku = product.sku?.trim() || "VAR";

  let created = 0;
  for (const [index, combo] of missing.entries()) {
    const key = comboKey(combo.map((v) => v.id));
    let sku = `${baseSku}-${combo.map((v) => variantSkuSuffix(v.value)).join("-")}`;
    for (let n = 2; usedSkus.has(sku); n++) sku = `${baseSku}-${combo.map((v) => variantSkuSuffix(v.value)).join("-")}-${n}`;
    usedSkus.add(sku);

    const name = formatVariantLabel(combo.map((v) => v.value)) ?? sku;
    const { data: variant, error } = await supabase
      .from("product_variants")
      .insert({
        store_id: storeId,
        product_id: productId,
        sku,
        name,
        price: product.price,
        compare_at_price: product.compare_at_price,
        stock: stocks.get(key) ?? 0,
        is_active: true,
        sort_order: existingIds.length + index,
      })
      .select("id")
      .single();
    if (error || !variant) {
      revalidateProductSurface(customerId, storeId, productId);
      return { error: `"${name}" oluşturulamadı: ${error?.message ?? "bilinmeyen hata"} (${created} varyant oluşturuldu).`, success: null };
    }

    const { error: linkError } = await supabase
      .from("variant_option_values")
      .insert(combo.map((value) => ({ variant_id: variant.id, option_value_id: value.id, store_id: storeId })));
    if (linkError) {
      // Bağsız varyant vitrinde seçilemez; yarım kaydı geri al.
      await supabase.from("product_variants").delete().eq("id", variant.id).eq("store_id", storeId);
      revalidateProductSurface(customerId, storeId, productId);
      return { error: `"${name}" seçenek bağlantısı kurulamadı: ${linkError.message}`, success: null };
    }

    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "product.variant_create",
      entityType: "product_variant",
      entityId: variant.id,
      metadata: { productId, sku, name, stock: stocks.get(key) ?? 0, source: "missing_variants_button" },
    });
    created++;
  }

  revalidateProductSurface(customerId, storeId, productId);
  return { error: null, success: `${created} varyant oluşturuldu.` };
}

/** Tablodaki satır içi düzenleme: SKU, fiyat, karşılaştırma fiyatı, stok. Boş fiyat = ürün fiyatını devral (NULL). */
export async function updateVariantInlineAction(
  customerId: string,
  storeId: string,
  productId: string,
  variantId: string,
  _prevState: ColorVariantFormState,
  formData: FormData,
): Promise<ColorVariantFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const sku = String(formData.get("sku") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const compareRaw = String(formData.get("compareAtPrice") ?? "").trim();
  const stockRaw = String(formData.get("stock") ?? "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw.replace(",", "."));
  const compareAtPrice = compareRaw === "" ? null : Number(compareRaw.replace(",", "."));
  const stock = Number(stockRaw);

  if (!sku || sku.length > 100) return { error: "SKU zorunlu.", success: null };
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: "Geçerli bir fiyat girin.", success: null };
  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < 0)) return { error: "Geçerli bir eski fiyat girin.", success: null };
  if (price !== null && compareAtPrice !== null && compareAtPrice < price) return { error: "Eski fiyat, satış fiyatından düşük olamaz.", success: null };
  if (stockRaw === "" || !Number.isInteger(stock) || stock < 0) return { error: "Stok 0 veya üstü tam sayı olmalı.", success: null };

  const supabase = await createSupabaseServerClient();
  const { data: updated, error } = await supabase
    .from("product_variants")
    .update({ sku, price, compare_at_price: compareAtPrice, stock })
    .eq("id", variantId)
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .select("id");
  if (error) {
    return { error: error.code === "23505" ? "Bu SKU mağazada başka bir varyantta kullanılıyor." : `Kaydedilemedi: ${error.message}`, success: null };
  }
  if (!updated || updated.length === 0) return { error: "Geçersiz varyant.", success: null };

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.variant_update",
    entityType: "product_variant",
    entityId: variantId,
    metadata: { productId, sku, price, compareAtPrice, stock },
  });

  revalidateProductSurface(customerId, storeId, productId);
  return { error: null, success: "Kaydedildi." };
}

/**
 * Görseli bir varyanta bağlar (variantId) ya da bağı kaldırır (null →
 * genel görsel, her renkte gösterilir). Görsel ve varyant AYNI ürüne ve
 * mağazaya ait olmalı. Başka renge bağlı bir görsel buradan bağlanırsa o
 * renge taşınır (bir görsel tek bir varyanta bağlı olabilir — şema).
 */
export async function linkImageToVariantAction(
  customerId: string,
  storeId: string,
  productId: string,
  imageId: string,
  variantId: string | null,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);
  const supabase = await createSupabaseServerClient();

  if (variantId) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (!variant) return;
  }

  const { data: updated } = await supabase
    .from("product_images")
    .update({ variant_id: variantId })
    .eq("id", imageId)
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .select("id");
  if (!updated || updated.length === 0) return;

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "product.image_variant_link",
    entityType: "product_image",
    entityId: imageId,
    metadata: { productId, variantId, linked: variantId !== null },
  });

  revalidateProductSurface(customerId, storeId, productId);
}
