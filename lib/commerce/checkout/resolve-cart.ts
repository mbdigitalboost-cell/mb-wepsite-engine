import "server-only";

import {
  getPublicProductAddons,
  getPublicProductBySlug,
  getPublicProductOptions,
  getPublicProductVariants,
  type PublicOptionGroup,
  type PublicProductVariant,
} from "@/lib/commerce/public/products";
import { computeConfiguredPrice } from "@/lib/commerce/pricing";
import { formatVariantLabel } from "@/lib/commerce/variant-label";
import { orderCartLinesSchema } from "@/lib/validation/order";

/**
 * Faz 32 — sepet satırlarının SUNUCUDA fiyatlandırılması; önceden
 * createOrderAction'ın içindeydi, önizleme de aynı yolu kullansın diye
 * buraya taşındı (davranış aynen korunuyor).
 *
 * SERVER-AUTHORITATIVE: istemci satır başına yalnız productSlug/variantId/
 * addonIds/quantity gönderir — fiyat, ad, etiket asla. Her satır taze
 * getPublicProduct* çağrılarıyla (RLS'nin _select_public_active policy'leri:
 * pasife alınmış ürün/varyant/ek geri gelmez) ve lib/commerce/pricing.ts'in
 * computeConfiguredPrice'ıyla yeniden çözülür.
 */
export interface ResolvedLine {
  productId: string;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  addons: Array<{ addonId: string; addonName: string; priceDelta: number }>;
}

export type ResolveCartResult = { ok: true; lines: ResolvedLine[]; subtotal: number } | { ok: false; error: string };

export async function resolveCartLines(storeId: string, rawCartItems: unknown): Promise<ResolveCartResult> {
  let rawLines: unknown;
  try {
    rawLines = typeof rawCartItems === "string" ? JSON.parse(rawCartItems) : rawCartItems;
  } catch {
    return { ok: false, error: "Sepet verisi okunamadı, lütfen sayfayı yenileyip tekrar deneyin." };
  }
  const parsedLines = orderCartLinesSchema.safeParse(rawLines ?? []);
  if (!parsedLines.success) {
    return { ok: false, error: parsedLines.error.issues[0]?.message ?? "Sepetiniz boş." };
  }

  // Her FARKLI ürün bir kez (satır başına değil) çekilir.
  const uniqueSlugs = [...new Set(parsedLines.data.map((line) => line.productSlug))];
  const productDataBySlug = new Map<
    string,
    {
      product: NonNullable<Awaited<ReturnType<typeof getPublicProductBySlug>>>;
      optionGroups: PublicOptionGroup[];
      variants: PublicProductVariant[];
      addons: Awaited<ReturnType<typeof getPublicProductAddons>>;
    }
  >();

  for (const slug of uniqueSlugs) {
    const product = await getPublicProductBySlug(storeId, slug);
    if (!product) continue; // aşağıda satır hatası olarak döner
    const [optionGroups, variants, addons] = await Promise.all([
      getPublicProductOptions(storeId, product.id),
      getPublicProductVariants(storeId, product.id),
      getPublicProductAddons(storeId, product.id),
    ]);
    productDataBySlug.set(slug, { product, optionGroups, variants, addons });
  }

  const lines: ResolvedLine[] = [];
  const lineErrors: string[] = [];

  for (const line of parsedLines.data) {
    const data = productDataBySlug.get(line.productSlug);
    if (!data) {
      lineErrors.push("Sepetinizdeki bir ürün artık mevcut değil.");
      continue;
    }
    const { product, optionGroups, variants, addons } = data;

    // Faz 25 — varyantı OLAN üründe varyantsız satır kabul edilmez.
    if (!line.variantId && optionGroups.length > 0 && variants.length > 0) {
      lineErrors.push(`${product.name}: lütfen ${optionGroups.map((g) => g.name.toLocaleLowerCase("tr")).join(" / ")} seçin.`);
      continue;
    }

    let matchedVariant: PublicProductVariant | null = null;
    if (line.variantId) {
      matchedVariant = variants.find((v) => v.id === line.variantId) ?? null;
      if (!matchedVariant) {
        lineErrors.push(`${product.name}: seçtiğiniz seçenek artık mevcut değil.`);
        continue;
      }
    }

    const resolvedAddons: ResolvedLine["addons"] = [];
    let addonMissing = false;
    for (const addonId of line.addonIds) {
      const addon = addons.find((a) => a.id === addonId);
      if (!addon) {
        addonMissing = true;
        break;
      }
      resolvedAddons.push({ addonId: addon.id, addonName: addon.name, priceDelta: addon.priceDelta });
    }
    if (addonMissing) {
      lineErrors.push(`${product.name}: seçtiğiniz bir ek ürün alanı artık mevcut değil.`);
      continue;
    }

    // İstemcinin seçtiği varyanttan grup→değer seçimini yeniden türetir
    // (computeConfiguredPrice'ı değiştirmeden besleyebilmek için).
    const selectedOptionValueIdByGroup: Record<string, string> = {};
    if (matchedVariant) {
      for (const valueId of matchedVariant.optionValueIds) {
        const group = optionGroups.find((g) => g.values.some((v) => v.id === valueId));
        if (group) selectedOptionValueIdByGroup[group.id] = valueId;
      }
    }

    const priced = computeConfiguredPrice({
      productPrice: product.price,
      productCompareAtPrice: product.compareAtPrice,
      optionGroups,
      variants,
      addons,
      selectedOptionValueIdByGroup,
      selectedAddonIds: line.addonIds,
    });

    // Faz 25 — okunabilir etiket sunucuda taze option değerlerinden.
    const variantLabel =
      matchedVariant && optionGroups.length > 0
        ? formatVariantLabel(
            optionGroups
              .map((g) => g.values.find((v) => v.id === selectedOptionValueIdByGroup[g.id])?.value ?? null)
              .filter((value): value is string => value !== null),
          )
        : null;

    lines.push({
      productId: product.id,
      variantId: matchedVariant?.id ?? null,
      productName: product.name,
      variantLabel,
      unitPrice: priced.totalPrice,
      quantity: line.quantity,
      lineTotal: priced.totalPrice * line.quantity,
      addons: resolvedAddons,
    });
  }

  if (lineErrors.length > 0) return { ok: false, error: [...new Set(lineErrors)].join(" ") };
  if (lines.length === 0) return { ok: false, error: "Sepetiniz boş." };

  return { ok: true, lines, subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0) };
}
