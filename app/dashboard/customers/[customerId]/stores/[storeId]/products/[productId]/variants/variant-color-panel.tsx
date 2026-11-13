import Image from "next/image";
import { Plus, X } from "lucide-react";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductImageSignedUrl } from "@/lib/commerce/get-product-image-signed-url";
import { comboKey, formatVariantLabel, variantSkuSuffix } from "@/lib/commerce/variant-label";
import { getColorSwatch } from "@/lib/utils/color-swatch-map";
import { createProductImageAction } from "../images/actions";
import { ProductImageForm } from "../images/image-form";
import {
  createMissingVariantsAction,
  createOptionSetupAction,
  linkImageToVariantAction,
  updateVariantInlineAction,
} from "./color-variant-actions";
import { CreateMissingVariantsForm, OptionSetupForm, VariantInlineForm } from "./color-variant-forms";

function formatTry(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

function swatchFor(values: string[]): string | null {
  for (const value of values) {
    const swatch = getColorSwatch(value);
    if (swatch) return swatch;
  }
  return null;
}

/**
 * Faz 25 — "Renk / Varyant / Görsel bağlama" (Varyantlar sekmesinin üstü).
 * Admin'in açık/nötr teması (#F6F6F7 / #FFFFFF / #17171A, #D95F00 yalnız vurgu).
 *
 *  - Seçenek grubu olup varyantı eksik kombinasyon varsa turuncu uyarı +
 *    "Eksik varyantları oluştur" (stok admin'den, zorunlu).
 *  - Varyant tablosu: renk noktası + ad + durum, SKU, fiyat, stok, bu renge
 *    ait görseller (× ile bağı kaldır, + ile mevcut görsellerden bağla ya
 *    da yeni yükle).
 *  - Görsel önizlemeleri SUNUCUDA imzalanır (private bucket, 1 saat).
 *
 * Yetki: sayfa görüntüleme requireStoreAccess (mevcut sekmelerle aynı);
 * tüm yazmalar color-variant-actions.ts'te store_editor+.
 */
export async function VariantColorPanel({
  customerId,
  storeId,
  productId,
}: {
  customerId: string;
  storeId: string;
  productId: string;
}) {
  await requireStoreAccess(storeId);
  const supabase = await createSupabaseServerClient();

  const [{ data: product }, { data: groupsData }, { data: variantsData }, { data: imagesData }] = await Promise.all([
    supabase.from("products").select("id, sku, price").eq("id", productId).eq("store_id", storeId).maybeSingle(),
    supabase.from("option_groups").select("id, name, sort_order").eq("product_id", productId).eq("store_id", storeId).order("sort_order"),
    supabase
      .from("product_variants")
      .select("id, sku, name, price, compare_at_price, stock, is_active, sort_order")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .order("sort_order"),
    supabase
      .from("product_images")
      .select("id, storage_path, alt_text, variant_id, is_primary, sort_order")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .order("sort_order"),
  ]);
  if (!product) return null;

  const groups = groupsData ?? [];

  const { data: valuesData } =
    groups.length > 0
      ? await supabase
          .from("option_values")
          .select("id, option_group_id, value, sort_order")
          .in("option_group_id", groups.map((g) => g.id))
          .eq("store_id", storeId)
          .order("sort_order")
      : { data: [] as { id: string; option_group_id: string; value: string; sort_order: number }[] };
  const values = valuesData ?? [];
  const variants = variantsData ?? [];

  const { data: linksData } =
    variants.length > 0
      ? await supabase.from("variant_option_values").select("variant_id, option_value_id").in("variant_id", variants.map((v) => v.id)).eq("store_id", storeId)
      : { data: [] as { variant_id: string; option_value_id: string }[] };
  const valueById = new Map(values.map((v) => [v.id, v]));
  const valueIdsByVariant = new Map<string, string[]>();
  for (const link of linksData ?? []) valueIdsByVariant.set(link.variant_id, [...(valueIdsByVariant.get(link.variant_id) ?? []), link.option_value_id]);

  // Eksik kombinasyonlar (tüm grupların kartezyen çarpımı − mevcut varyantlar).
  const groupedValues = groups.map((g) => values.filter((v) => v.option_group_id === g.id));
  const combinations = groups.length === 0 || groupedValues.some((list) => list.length === 0)
    ? []
    : groupedValues.reduce<(typeof values)[]>((acc, list) => acc.flatMap((combo) => list.map((v) => [...combo, v])), [[]]);
  const existingKeys = new Set([...valueIdsByVariant.values()].map(comboKey));
  const missing = combinations.filter((combo) => !existingKeys.has(comboKey(combo.map((v) => v.id))));
  const baseSku = product.sku?.trim() || "VAR";

  const images = await Promise.all(
    (imagesData ?? []).map(async (image) => ({ ...image, url: (await getProductImageSignedUrl(image.storage_path)).url })),
  );
  const generalImages = images.filter((image) => !image.variant_id);

  return (
    <section className="mb-8 rounded-xl border border-[#E4E4E7] bg-[#F6F6F7] p-5 text-[#17171A]">
      <h2 className="text-sm font-semibold tracking-tight">Renkler ve Varyantlar</h2>

      {/* Faz 26 — tek adımda kurulum: grup + değerler + varyantlar tek transaction'da. */}
      <div className="mt-3 rounded-lg border border-[#E4E4E7] bg-white p-4">
        <p className="text-sm font-medium">{groups.length === 0 ? "Seçenek ekle (ör. Renk)" : "Seçenek ekle"}</p>
        <p className="mt-0.5 text-xs text-[#71717A]">
          Değerleri virgülle yazın; her değer için satılabilir bir varyant otomatik oluşur (fiyat üründen, stok 0 — sonra aşağıdan girin).
        </p>
        <div className="mt-3">
          <OptionSetupForm
            action={createOptionSetupAction.bind(null, customerId, storeId, productId)}
            existingGroups={groups.map((g) => ({ id: g.id, name: g.name }))}
            hasVariants={variants.length > 0}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-[#71717A]">
        Bir renge bağlı görsel varsa, mağazada o renk seçilince galeri o görsellere geçer. Hiçbir renge bağlanmamış görseller ürünün genel
        görselleridir ve her renkte gösterilir.
      </p>

      {missing.length > 0 ? (
        <div className="mt-4 rounded-lg border border-[#D95F00]/40 bg-[#D95F00]/[0.07] p-4">
          <p className="text-sm font-medium text-[#8A3C00]">
            {variants.length === 0
              ? `Bu üründe ${missing.length} ${groups.map((g) => g.name.toLocaleLowerCase("tr")).join(" / ")} seçeneği var ama hiç varyant oluşturulmamış; siparişlerde hangi seçeneğin alındığı kaydedilmiyor.`
              : `${missing.length} seçenek kombinasyonunun varyantı eksik; bu seçenekler mağazada satın alınamaz.`}
          </p>
          <p className="mt-1 text-xs text-[#8A3C00]/80">
            Fiyat ve eski fiyat üründen kopyalanır. Her biri için gerçek stok adedini girin — ürünün mevcut stoğu otomatik bölünmez.
          </p>
          <CreateMissingVariantsForm
            action={createMissingVariantsAction.bind(null, customerId, storeId, productId)}
            combos={missing.map((combo) => ({
              key: comboKey(combo.map((v) => v.id)),
              label: formatVariantLabel(combo.map((v) => v.value)) ?? "",
              swatch: swatchFor(combo.map((v) => v.value)),
              sku: `${baseSku}-${combo.map((v) => variantSkuSuffix(v.value)).join("-")}`,
            }))}
          />
        </div>
      ) : null}

      {variants.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {variants.map((variant) => {
            const variantValues = (valueIdsByVariant.get(variant.id) ?? []).map((id) => valueById.get(id)?.value).filter((v): v is string => Boolean(v));
            const label = formatVariantLabel(variantValues) ?? variant.name;
            const swatch = swatchFor(variantValues);
            const ownImages = images.filter((image) => image.variant_id === variant.id);
            const linkableImages = images.filter((image) => image.variant_id !== variant.id);
            const status =
              variantValues.length === 0
                ? "Seçenek atanmamış — mağazada seçilemez"
                : !variant.is_active
                  ? "Pasif"
                  : variant.stock === 0
                    ? `Stok girin (şu an 0)${ownImages.length > 0 ? ` · ${ownImages.length} görsel bağlı` : ""}`
                  : ownImages.length > 0
                    ? `${ownImages.length} görsel bağlı`
                    : generalImages.length > 0
                      ? "Bağlı görsel yok — genel görseller gösterilir"
                      : "Bağlı görsel yok — mağazada fotoğraf yer tutucusu görünür";

            return (
              <li key={variant.id} className="rounded-lg border border-[#E4E4E7] bg-white p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex min-w-[180px] items-start gap-2.5">
                    <span
                      className="mt-1 h-4 w-4 shrink-0 rounded-full border border-black/15"
                      style={{ backgroundColor: swatch ?? "transparent" }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className={`text-xs ${variant.stock === 0 && variant.is_active ? "font-medium text-[#B34C00]" : ownImages.length > 0 ? "text-green-700" : "text-[#71717A]"}`}>{status}</p>
                    </div>
                  </div>
                  <div className="min-w-[280px] flex-1">
                    <VariantInlineForm
                      action={updateVariantInlineAction.bind(null, customerId, storeId, productId, variant.id)}
                      initial={{
                        sku: variant.sku ?? "",
                        price: variant.price === null ? "" : String(Number(variant.price)),
                        compareAtPrice: variant.compare_at_price === null ? "" : String(Number(variant.compare_at_price)),
                        stock: String(variant.stock),
                        isActive: variant.is_active,
                      }}
                      productPriceLabel={`Ürün: ${formatTry(Number(product.price))}`}
                    />
                  </div>
                </div>

                <div className="mt-3 border-t border-[#F0F0F2] pt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#71717A]">Bu renge ait görseller</p>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    {ownImages.map((image) => (
                      <div key={image.id} className="relative h-16 w-16 overflow-hidden rounded-md border border-[#E4E4E7] bg-[#F6F6F7]">
                        {image.url ? <Image src={image.url} alt={image.alt_text ?? ""} fill unoptimized sizes="64px" className="object-cover" /> : null}
                        <form action={linkImageToVariantAction.bind(null, customerId, storeId, productId, image.id, null)} className="absolute right-0.5 top-0.5">
                          <button
                            type="submit"
                            aria-label="Görselin bu renkle bağını kaldır"
                            title="Bağı kaldır (genel görsel olur)"
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[#17171A] shadow hover:text-red-600"
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                        </form>
                      </div>
                    ))}

                    <details className="group">
                      <summary
                        className="flex h-16 w-16 cursor-pointer list-none items-center justify-center rounded-md border border-dashed border-[#D4D4D8] text-[#71717A] hover:border-[#D95F00] hover:text-[#D95F00]"
                        aria-label="Bu renge görsel ekle"
                      >
                        <Plus size={18} aria-hidden="true" />
                      </summary>
                      <div className="mt-2 w-[min(100%,520px)] rounded-lg border border-[#E4E4E7] bg-white p-3 shadow-sm">
                        {linkableImages.length > 0 ? (
                          <>
                            <p className="text-xs text-[#71717A]">Ürünün mevcut görsellerinden seç (başka renge bağlıysa bu renge taşınır):</p>
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {linkableImages.map((image) => (
                                <li key={image.id}>
                                  <form action={linkImageToVariantAction.bind(null, customerId, storeId, productId, image.id, variant.id)}>
                                    <button
                                      type="submit"
                                      className="relative block h-16 w-16 overflow-hidden rounded-md border-2 border-transparent bg-[#F6F6F7] hover:border-[#D95F00]"
                                      title={image.variant_id ? "Başka renge bağlı — bu renge taşı" : "Genel görsel — bu renge bağla"}
                                    >
                                      {image.url ? <Image src={image.url} alt={image.alt_text ?? ""} fill unoptimized sizes="64px" className="object-cover" /> : null}
                                      {image.variant_id ? (
                                        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] text-white">başka renk</span>
                                      ) : null}
                                    </button>
                                  </form>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        <p className="mt-3 text-xs text-[#71717A]">ya da bu renge yeni görsel yükle:</p>
                        <div className="mt-2">
                          <ProductImageForm
                            mode="create"
                            variantId={variant.id}
                            action={createProductImageAction.bind(null, customerId, storeId, productId)}
                            submitLabel="Yükle ve bu renge bağla"
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
