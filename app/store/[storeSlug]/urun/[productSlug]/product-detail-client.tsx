"use client";

import { freeShippingClaim, productQualifiesForFreeShipping, type ShippingFeeSettings } from "@/lib/commerce/shipping-fee";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, ImageOff, Minus, Plus, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils/format-price";
import { computeConfiguredPrice, displayPriceFor, resolveRequiredAddonIds } from "@/lib/commerce/pricing";
import { FreeShippingProgress } from "@/components/commerce/public/cart/free-shipping-progress";
import { formatOptionValue, formatVariantLabel } from "@/lib/commerce/variant-label";
import { useCart, makeCartLineId } from "@/components/commerce/public/cart/cart-context";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";
import { getColorSwatch } from "@/lib/utils/color-swatch-map";
import type {
  PublicOptionGroup,
  PublicProductAddon,
  PublicProductImage,
  PublicProductInventory,
  PublicProductVariant,
} from "@/lib/commerce/public/products";


interface ProductDetailClientProps {
  productId: string;
  productSlug: string;
  productName: string;
  brandName: string | null;
  shortDescription: string | null;
  productPrice: number;
  productCompareAtPrice: number | null;
  /** Sunucuda (sayfa render'ında) TÜM varyantların görselleri imzalanmış hâlde gelir — client asla imza üretmez/saklamaz. */
  images: PublicProductImage[];
  optionGroups: PublicOptionGroup[];
  variants: PublicProductVariant[];
  addons: PublicProductAddon[];
  inventory: PublicProductInventory | null;
  /** products.models — uyumlu silah modelleri (yalnızca bilgi; siparişe yazılacak bir alan YOK, bkz. aşağıdaki not). */
  models: string[];
  /** "Kendi Üretimimiz" rozeti yalnızca bu iddiayı doğrulanmış olarak kullanan mağazada gösterilir. */
  showOwnProductionBadge: boolean;
  /** Faz 31 — mağazanın kargo ücreti ayarı (sabit 2.000 TL yerine). */
  shippingSettings: ShippingFeeSettings;
}

function sortImages(images: PublicProductImage[]): PublicProductImage[] {
  return [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
}

/**
 * Faz 25 — Ürün sayfası v4: galeri + satın alma kutusu TEK client bileşende,
 * çünkü ikisi de aynı seçim durumuna bağlı (renk değişince galeri, fiyat,
 * indirim rozeti ve stok satırı birlikte güncellenir).
 *
 * GALERİ KURALI (rapordaki ile aynı):
 *  1. Tam seçim bir varyanta eşleşti VE o varyanta bağlı görsel var → yalnız onlar.
 *  2. Aksi hâlde hiçbir varyanta bağlanmamış (genel) görseller.
 *  3. Seçili varyantın da, genel görselin de hiç olmadığı durumda: "Bu renk
 *     için fotoğraf henüz eklenmedi" yer tutucusu — başka bir rengin
 *     fotoğrafını o renkmiş gibi göstermek yanıltıcı olur.
 *  Seçim yokken: genel görseller; hiç genel görsel yoksa tüm görseller.
 *  Seçim değişince küçük şerit ve ana görsel ilk görsele döner.
 *
 * FİYAT/STOK: computeConfiguredPrice (pricing.ts) değişmedi — varyantın
 * kendi price'ı varsa o, yoksa ürünün; compareAtPrice aynı kaynaktan.
 * Stok satırı: track_inventory kapalıysa hiç yok; eşleşen varyant varsa
 * varyant stoğu, yoksa ürün stoğu. Uydurma aciliyet ifadesi yok.
 *
 * İMZALI URL: images[].url sayfa render'ında sunucuda imzalandı (1 saat);
 * burada yalnızca seçim yapılır, localStorage'a görsel URL'i yazılmaz
 * (sepet zaten resolveCartProductImages ile tazeliyor — Faz 7.3 #13).
 *
 * MODELLER: products.models uyumluluk bilgisi olarak hap şeklinde
 * gösteriliyor, SEÇİLEBİLİR DEĞİL — siparişte model kaydedecek bir alan
 * yok; seçtirip kaydetmemek müşteriyi yanıltırdı. Model gerçekten farklı
 * bir ürünse varyant olarak (seçenek grubu) tanımlanmalı.
 */
export function ProductDetailClient({
  productId,
  productSlug,
  productName,
  brandName,
  shortDescription,
  productPrice,
  productCompareAtPrice,
  images,
  optionGroups,
  variants,
  addons,
  inventory,
  models,
  showOwnProductionBadge,
  shippingSettings,
}: ProductDetailClientProps) {
  const { addItem, subtotal: cartSubtotal } = useCart();

  const [selectedOptionValueIdByGroup, setSelectedOptionValueIdByGroup] = useState<Record<string, string>>({});
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(() => resolveRequiredAddonIds(addons));
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const requiredAddonIds = useMemo(() => new Set(resolveRequiredAddonIds(addons)), [addons]);

  const priced = useMemo(
    () =>
      computeConfiguredPrice({
        productPrice,
        productCompareAtPrice,
        optionGroups,
        variants,
        addons,
        selectedOptionValueIdByGroup,
        selectedAddonIds,
      }),
    [productPrice, productCompareAtPrice, optionGroups, variants, addons, selectedOptionValueIdByGroup, selectedAddonIds],
  );
  const matchedVariant = priced.matchedVariant;

  const allGroupsSelected = optionGroups.every((g) => Boolean(selectedOptionValueIdByGroup[g.id]));
  const hasVariants = variants.length > 0;
  const missingGroups = optionGroups.filter((g) => !selectedOptionValueIdByGroup[g.id]);
  const needsSelection = optionGroups.length > 0 && !allGroupsSelected;
  // Varyantı olan üründe tam seçim bir varyanta çözülmüyorsa satılamaz (sunucu da reddeder).
  const selectionUnavailable = !needsSelection && optionGroups.length > 0 && hasVariants && !matchedVariant;

  const trackInventory = inventory?.trackInventory ?? false;
  const stockCount = matchedVariant ? matchedVariant.stock : inventory?.stock ?? null;
  const showStockLine = trackInventory && stockCount !== null && !(needsSelection && hasVariants);
  const outOfStock = matchedVariant
    ? !matchedVariant.inStock
    : trackInventory && !hasVariants && (inventory?.stock ?? 0) <= 0;
  const canAddToCart = !needsSelection && !selectionUnavailable && !outOfStock;

  // Faz 34 — seçim tamamlanmadan ürün kartıyla AYNI vitrin fiyatı (displayPriceFor):
  // önceden ürünün taban fiyatı görünüp renk seçilince varyant fiyatına zıplıyordu.
  const unselectedDisplay = !matchedVariant && hasVariants ? displayPriceFor(productPrice, productCompareAtPrice, variants) : null;
  const shownBase = unselectedDisplay ? unselectedDisplay.price : priced.basePrice;
  const shownCompare = unselectedDisplay ? unselectedDisplay.compareAtPrice : priced.baseCompareAtPrice;
  const shownTotal = shownBase + priced.addonsTotal;
  const discountPercent = shownCompare && shownCompare > shownBase ? Math.round(((shownCompare - shownBase) / shownCompare) * 100) : null;
  const savings = shownCompare && shownCompare > shownBase ? shownCompare - shownBase : null;
  const qualifiesFreeShipping = productQualifiesForFreeShipping(shownTotal, shippingSettings);
  const shippingClaim = freeShippingClaim(shippingSettings);
  const lineTotal = priced.totalPrice * quantity;

  const selectionLabel = formatVariantLabel(
    optionGroups
      .map((g) => g.values.find((v) => v.id === selectedOptionValueIdByGroup[g.id])?.value ?? null)
      .filter((value): value is string => value !== null),
  );

  // ---- Galeri ----
  const generalImages = useMemo(() => sortImages(images.filter((image) => !image.variantId && image.url)), [images]);
  const galleryImages = useMemo(() => {
    if (matchedVariant) {
      const own = sortImages(images.filter((image) => image.variantId === matchedVariant.id && image.url));
      if (own.length > 0) return own;
      return generalImages;
    }
    if (generalImages.length > 0) return generalImages;
    return allGroupsSelected && optionGroups.length > 0 ? [] : sortImages(images.filter((image) => image.url));
  }, [images, matchedVariant, generalImages, allGroupsSelected, optionGroups.length]);
  const activeImage = galleryImages[Math.min(activeImageIndex, galleryImages.length - 1)] ?? null;

  function selectOptionValue(groupId: string, valueId: string) {
    setSelectedOptionValueIdByGroup((prev) => ({ ...prev, [groupId]: valueId }));
    setActiveImageIndex(0);
    setJustAdded(false);
  }

  function toggleAddon(addonId: string) {
    if (requiredAddonIds.has(addonId)) return;
    setSelectedAddonIds((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
    setJustAdded(false);
  }

  function handleAddToCart() {
    if (!canAddToCart) return;
    const variantId = matchedVariant?.id ?? null;
    const selectedAddons = addons.filter((a) => selectedAddonIds.includes(a.id));
    addItem(
      {
        lineId: makeCartLineId(productId, variantId, selectedAddonIds),
        productId,
        productSlug,
        productName,
        imageUrl: galleryImages[0]?.url ?? generalImages[0]?.url ?? null,
        variantId,
        variantLabel: selectionLabel,
        addonIds: [...selectedAddonIds],
        addonLabels: selectedAddons.map((a) => `${a.name} (+${formatPrice(a.priceDelta)})`),
        unitPrice: priced.totalPrice,
      },
      quantity,
    );
    setJustAdded(true);
    setQuantity(1);
  }

  const blockingMessage = needsSelection
    ? `${missingGroups.map((g) => formatOptionValue(g.name)).join(" ve ")} seçin`
    : selectionUnavailable
      ? "Bu seçenek şu an satışta değil"
      : outOfStock
        ? "Bu seçenek şu an stokta yok"
        : null;

  const addToCartLabel = justAdded ? "Sepete Eklendi ✓" : canAddToCart ? `Sepete Ekle — ${formatPrice(lineTotal)}` : blockingMessage ?? "Sepete Ekle";

  return (
    <>
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* ================= GALERİ ================= */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-[14px] border border-[#292929] bg-[#171717]">
            {activeImage?.url ? (
              <Image
                key={activeImage.id}
                src={activeImage.url}
                alt={activeImage.altText ?? productName}
                fill
                unoptimized
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-[#A3A3A3]">
                <ImageOff size={28} aria-hidden="true" />
                {selectionLabel ? `${selectionLabel} için fotoğraf henüz eklenmedi` : "Görsel yok"}
              </div>
            )}
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {discountPercent !== null ? (
                <span className={`${storefrontMonoClasses} rounded-md bg-[#D95F00] px-2.5 py-1 text-xs font-bold text-[#1A0D00]`}>
                  %{discountPercent} İNDİRİM
                </span>
              ) : null}
              {showOwnProductionBadge ? (
                <span className={`${storefrontMonoClasses} rounded-md border border-[#F5F5F5]/40 bg-[#0A0A0A]/70 px-2.5 py-1 text-xs font-semibold text-[#F5F5F5]`}>
                  KENDİ ÜRETİMİMİZ
                </span>
              ) : null}
            </div>
          </div>

          {galleryImages.length > 1 ? (
            <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {galleryImages.map((image, index) => (
                <li key={image.id}>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`Görsel ${index + 1}`}
                    aria-current={index === activeImageIndex}
                    className={`relative block aspect-square w-full overflow-hidden rounded-lg border-[1.5px] bg-[#171717] transition-colors ${
                      index === activeImageIndex ? "border-[#D95F00]" : "border-[#292929] hover:border-[#6B6B6B]"
                    }`}
                  >
                    {image.url ? (
                      <Image src={image.url} alt="" fill unoptimized sizes="80px" className="object-cover object-center" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* ================= SATIN ALMA KUTUSU ================= */}
        <div>
          {brandName ? (
            <p className={`${storefrontMonoClasses} text-xs font-semibold uppercase tracking-[0.2em] text-[#D95F00]`}>{brandName}</p>
          ) : null}
          <h1 className={`${storefrontDisplayClasses} mt-2 text-2xl font-bold leading-tight text-[#F5F5F5] sm:text-3xl`}>{productName}</h1>
          {shortDescription ? <p className="mt-3 text-sm leading-relaxed text-[#A3A3A3]">{shortDescription}</p> : null}

          <div className="mt-5 border-y border-[#292929] py-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className={`${storefrontMonoClasses} text-3xl font-bold text-[#F5F5F5] sm:text-4xl`}>{formatPrice(shownTotal)}</span>
              {shownCompare && savings ? (
                <span className={`${storefrontMonoClasses} text-base text-[#6B6B6B] line-through`}>{formatPrice(shownCompare)}</span>
              ) : null}
              {unselectedDisplay?.from ? <span className="text-xs text-[#A3A3A3]">seçeneğe göre değişir</span> : null}
            </div>
            {savings || qualifiesFreeShipping ? (
              <p className="mt-1.5 text-sm font-medium text-[#3FA34D]">
                {[savings ? `${formatPrice(savings)} kazanıyorsunuz` : null, qualifiesFreeShipping ? "Bu ürün ücretsiz kargo" : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>

          {optionGroups.map((group) => {
            const selected = group.values.find((v) => v.id === selectedOptionValueIdByGroup[group.id]);
            return (
              <div key={group.id} className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <p className={`${storefrontMonoClasses} text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]`}>{group.name}</p>
                  {selected ? (
                    <p className="text-xs text-[#A3A3A3]">
                      Seçili: <span className="font-medium text-[#F5F5F5]">{formatOptionValue(selected.value)}</span>
                    </p>
                  ) : null}
                </div>
                <div role="radiogroup" aria-label={group.name} className="mt-2.5 flex flex-wrap gap-2.5">
                  {group.values.map((value) => {
                    const isSelected = selected?.id === value.id;
                    const swatch = getColorSwatch(value.value);
                    return (
                      <button
                        key={value.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => selectOptionValue(group.id, value.id)}
                        style={isSelected ? { boxShadow: "0 0 0 3px rgba(217,95,0,0.22)" } : undefined}
                        className={`inline-flex min-h-[44px] items-center gap-2.5 rounded-full border-[1.5px] px-4 text-sm font-medium transition-colors ${
                          isSelected
                            ? "border-[#D95F00] bg-[#D95F00]/10 text-[#F5F5F5]"
                            : "border-[#3A3A3A] bg-[#171717] text-[#A3A3A3] hover:border-[#D95F00] hover:text-[#F5F5F5]"
                        }`}
                      >
                        {swatch ? (
                          <span className="h-4 w-4 shrink-0 rounded-full border border-white/25" style={{ backgroundColor: swatch }} aria-hidden="true" />
                        ) : null}
                        {formatOptionValue(value.value)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {models.length > 0 ? (
            <div className="mt-6">
              <p className={`${storefrontMonoClasses} text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]`}>Uyumlu Silah Modelleri</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {models.map((model) => (
                  <li
                    key={model}
                    className={`${storefrontMonoClasses} inline-flex items-center gap-1.5 rounded-full border border-[#292929] bg-[#171717] px-3.5 py-1.5 text-xs font-semibold text-[#F5F5F5]`}
                  >
                    <Check size={12} className="text-[#D95F00]" aria-hidden="true" />
                    {model}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {addons.length > 0 ? (
            <div className="mt-6">
              <p className={`${storefrontMonoClasses} text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]`}>Ek Seçenekler</p>
              <ul className="mt-2.5 space-y-2">
                {addons.map((addon) => {
                  const isRequired = requiredAddonIds.has(addon.id);
                  const isChecked = selectedAddonIds.includes(addon.id);
                  const disabled = isRequired || (!addon.inStock && !isChecked);
                  return (
                    <li key={addon.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        disabled={disabled}
                        onClick={() => toggleAddon(addon.id)}
                        className={`flex w-full items-center gap-3 rounded-[12px] border-[1.5px] p-4 text-left transition-colors ${
                          isChecked ? "border-[#D95F00] bg-[#D95F00]/10" : "border-[#292929] bg-[#171717] hover:border-[#D95F00]/60"
                        } ${disabled && !isRequired ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] ${
                            isChecked ? "border-[#D95F00] bg-[#D95F00] text-[#1A0D00]" : "border-[#4A4A46] bg-[#0A0A0A]"
                          }`}
                          aria-hidden="true"
                        >
                          {isChecked ? <Check size={13} strokeWidth={3} /> : null}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-[#F5F5F5]">{addon.name}</span>
                          <span className="block text-xs text-[#A3A3A3]">
                            {isRequired ? "Zorunlu seçenek" : !addon.inStock ? "Şu an stokta yok" : "İsteğe bağlı ek"}
                          </span>
                        </span>
                        <span className={`${storefrontMonoClasses} text-sm font-semibold text-[#F5F5F5]`}>+{formatPrice(addon.priceDelta)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {showStockLine ? (
            <p className="mt-6 flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${stockCount && stockCount > 0 ? "bg-[#3FA34D]" : "bg-red-500"}`} aria-hidden="true" />
              {stockCount && stockCount > 0 ? (
                <span className="text-[#F5F5F5]">Stokta {stockCount} adet var</span>
              ) : (
                <span className="text-red-400">Stokta yok</span>
              )}
            </p>
          ) : null}

          <div className="mt-4 flex items-stretch gap-3">
            <div className="flex h-14 items-center rounded-[12px] border-[1.5px] border-[#3A3A3A] bg-[#171717]">
              <button
                type="button"
                aria-label="Adedi azalt"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-full w-11 items-center justify-center text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <span className={`${storefrontMonoClasses} min-w-[2.5ch] text-center text-base text-[#F5F5F5]`}>{quantity}</span>
              <button
                type="button"
                aria-label="Adedi artır"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-full w-11 items-center justify-center text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              disabled={!canAddToCart}
              onClick={handleAddToCart}
              className={`${storefrontDisplayClasses} inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[12px] px-5 text-sm font-bold transition-colors sm:text-base ${
                canAddToCart || justAdded
                  ? "bg-[#D95F00] text-[#1A0D00] hover:bg-[#B34C00]"
                  : "cursor-not-allowed border-[1.5px] border-[#3A3A3A] bg-[#171717] text-[#A3A3A3]"
              }`}
            >
              {canAddToCart ? <ShoppingCart size={18} aria-hidden="true" /> : null}
              {addToCartLabel}
            </button>
          </div>
          {/* Faz 34 Kısım C — sepete ekledikten sonra: ücretsiz kargoya kalan (sepetin tamamına göre). */}
          {justAdded ? <FreeShippingProgress itemsTotal={cartSubtotal} settings={shippingSettings} className="mt-3" /> : null}

          <ul
            className="mt-6 grid divide-x divide-[#292929] rounded-[12px] border border-[#292929] bg-[#171717] text-center"
            style={{ gridTemplateColumns: `repeat(${showOwnProductionBadge ? 3 : 2}, minmax(0, 1fr))` }}
          >
            {[
              ...(showOwnProductionBadge ? [{ title: "Kendi Üretimimiz", sub: "Kydex işçiliği" }] : []),
              ...(shippingClaim && shippingSettings.freeShippingThreshold !== null
                ? [{ title: "Ücretsiz Kargo", sub: `${shippingSettings.freeShippingThreshold.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL üzeri` }]
                : []),
              { title: "Güvenli Ödeme", sub: "Korumalı alışveriş" },
            ].map((item) => (
              <li key={item.title} className="px-2 py-3">
                <p className={`${storefrontDisplayClasses} text-[11px] font-semibold text-[#F5F5F5] sm:text-xs`}>{item.title}</p>
                <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{item.sub}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ================= MOBİL SABİT ALT ÇUBUK ================= */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#292929] bg-[#0A0A0A]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={`${storefrontMonoClasses} text-base font-bold text-[#F5F5F5]`}>{formatPrice(lineTotal)}</p>
            <p className="truncate text-xs text-[#A3A3A3]">{selectionLabel ?? productName}</p>
          </div>
          <button
            type="button"
            disabled={!canAddToCart}
            onClick={handleAddToCart}
            className={`${storefrontDisplayClasses} inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[12px] px-5 text-sm font-bold ${
              canAddToCart || justAdded ? "bg-[#D95F00] text-[#1A0D00]" : "cursor-not-allowed border-[1.5px] border-[#3A3A3A] bg-[#171717] text-[#A3A3A3]"
            }`}
          >
            {justAdded ? "Eklendi ✓" : canAddToCart ? "Sepete Ekle" : blockingMessage ?? "Sepete Ekle"}
          </button>
        </div>
      </div>
    </>
  );
}
