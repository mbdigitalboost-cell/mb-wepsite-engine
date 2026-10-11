"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils/format-price";
import { computeConfiguredPrice, resolveRequiredAddonIds } from "@/lib/commerce/pricing";
import { useCart, makeCartLineId } from "@/components/commerce/public/cart/cart-context";
import { storefrontRadioClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontButtonClasses } from "@/lib/utils/storefront-button-classes";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";
import { getColorSwatch } from "@/lib/utils/color-swatch-map";
import type { PublicOptionGroup, PublicProductAddon, PublicProductVariant } from "@/lib/commerce/public/products";

interface ProductConfiguratorProps {
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  productCompareAtPrice: number | null;
  imageUrl: string | null;
  optionGroups: PublicOptionGroup[];
  variants: PublicProductVariant[];
  addons: PublicProductAddon[];
}

/**
 * FAZ 1 (mağaza sepeti/configurator) — mounted at the "STEP 22
 * configurator boundary" marker in ../page.tsx. Owns the ONLY price
 * display on the product page now (the previous static product.price/
 * compareAtPrice block was removed from page.tsx, not duplicated here —
 * two numbers on the same page that could disagree once a variant/addon
 * is selected would look like a bug, not a feature).
 *
 * All pricing goes through lib/commerce/pricing.ts's computeConfiguredPrice
 * — this component never computes a price by hand — so the exact same
 * resolution rules apply here as anywhere else that function is reused.
 * Nothing here is server-authoritative: this is a Faz 1 preview only, see
 * that module's own Faz 2 note.
 *
 * Faz 12 devamı (Part A) — v2 koyu tema. Generic `Button` (components/ui/
 * button.tsx) bilerek KULLANILMADI — storefront'a henüz bir ThemeProvider
 * bağlanmadığı için o bileşenin `bg-brand-*` token'ları hiç set edilmiyor,
 * yani fiilen stilsiz render oluyordu (bkz. storefront-button-classes.ts'in
 * kendi doc comment'i) — hero/CTA bandı gibi daha önce v2'ye taşınan her
 * yer zaten aynı sebeple generic Button'ı atlamıştı, burada da aynı desen.
 * Ek ürün checkbox'ları storefrontRadioClasses kullanıyor — checkout
 * formlarındaki AYNI opak/hardcoded renk mantığı (koyu üstünde koyu metin
 * hatasını tekrarlamamak için).
 *
 * Faz 12 devamı (2. tur, Part B) — "premium" yoğunluk geçişi: renk
 * pilleri lib/utils/color-swatch-map.ts'ten GERÇEK bir eşleşme varsa küçük
 * bir renk noktası taşıyor (tanınmayan isim = noktasız, uydurma renk YOK);
 * yan ürünler düz checkbox yerine kart/pil stiline geçti; fiyatın yanında
 * compareAtPrice varsa CANLI hesaplanan bir "%X İndirim" rozeti var (sabit/
 * uydurma bir sayı değil); bölümler arası boşluk artırıldı. Hiçbiri veri/
 * fiyatlandırma MANTIĞINA dokunmuyor — computeConfiguredPrice hâlâ tek
 * doğruluk kaynağı, badge sadece onun zaten döndürdüğü iki sayıdan
 * (totalPrice/baseCompareAtPrice) türetiliyor.
 */
export function ProductConfigurator({
  productId,
  productSlug,
  productName,
  productPrice,
  productCompareAtPrice,
  imageUrl,
  optionGroups,
  variants,
  addons,
}: ProductConfiguratorProps) {
  const { addItem } = useCart();

  const [selectedOptionValueIdByGroup, setSelectedOptionValueIdByGroup] = useState<Record<string, string>>({});
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(() => resolveRequiredAddonIds(addons));
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

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

  const allGroupsSelected = optionGroups.every((g) => Boolean(selectedOptionValueIdByGroup[g.id]));
  // A product WITH option groups needs a full, matched selection before
  // it can be added — otherwise there's no single real thing being
  // bought. A product with none at all (most products, today) skips this
  // entirely. Faz 1 scope limit: individual value pills are never greyed
  // out per-combination-availability, only the final matched variant's
  // own inStock is checked once a full selection resolves — checking
  // every possible combination's stock up front is real added complexity
  // this phase doesn't need yet.
  const needsSelection = optionGroups.length > 0 && !allGroupsSelected;
  const selectionOutOfStock = Boolean(priced.matchedVariant) && priced.matchedVariant?.inStock === false;
  const canAddToCart = !needsSelection && !selectionOutOfStock;

  // Faz 12 devamı — canlı hesaplanan indirim yüzdesi, computeConfiguredPrice'ın
  // zaten döndürdüğü iki sayıdan (totalPrice/baseCompareAtPrice) türetiliyor,
  // ayrı/sabit bir sayı DEĞİL.
  const discountPercent =
    priced.baseCompareAtPrice && priced.baseCompareAtPrice > priced.totalPrice
      ? Math.round(((priced.baseCompareAtPrice - priced.totalPrice) / priced.baseCompareAtPrice) * 100)
      : null;

  function toggleOptionValue(groupId: string, valueId: string) {
    setSelectedOptionValueIdByGroup((prev) => ({ ...prev, [groupId]: valueId }));
    setJustAdded(false);
  }

  function toggleAddon(addonId: string) {
    if (requiredAddonIds.has(addonId)) return; // isRequired — auto-selected, never removable.
    setSelectedAddonIds((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
    setJustAdded(false);
  }

  function handleAddToCart() {
    if (!canAddToCart) return;

    const variantId = priced.matchedVariant?.id ?? null;
    const variantLabel =
      optionGroups.length > 0 && allGroupsSelected
        ? optionGroups
            .map((g) => {
              const valueId = selectedOptionValueIdByGroup[g.id];
              const value = g.values.find((v) => v.id === valueId);
              return value ? `${g.name}: ${value.value}` : null;
            })
            .filter((label): label is string => label !== null)
            .join(", ")
        : null;

    const selectedAddons = addons.filter((a) => selectedAddonIds.includes(a.id));
    const addonLabels = selectedAddons.map((a) => `${a.name} (+${formatPrice(a.priceDelta)})`);

    addItem(
      {
        lineId: makeCartLineId(productId, variantId, selectedAddonIds),
        productId,
        productSlug,
        productName,
        imageUrl,
        variantId,
        variantLabel,
        addonIds: [...selectedAddonIds],
        addonLabels,
        unitPrice: priced.totalPrice,
      },
      quantity,
    );

    setJustAdded(true);
    setQuantity(1);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`${storefrontMonoClasses} text-3xl font-bold text-[#F5F5F5]`}>{formatPrice(priced.totalPrice)}</span>
        {priced.baseCompareAtPrice ? (
          <span className={`${storefrontMonoClasses} text-base text-[#A3A3A3] line-through`}>{formatPrice(priced.baseCompareAtPrice)}</span>
        ) : null}
        {discountPercent !== null ? (
          <span className={`${storefrontDisplayClasses} rounded-full bg-[#D95F00]/15 px-2.5 py-1 text-xs font-bold text-[#D95F00]`}>
            %{discountPercent} İndirim
          </span>
        ) : null}
      </div>

      {optionGroups.map((group) => (
        <div key={group.id} className="mt-6">
          <p className={`${storefrontMonoClasses} text-xs uppercase text-[#6B6B6B]`}>{group.name}</p>
          {/*
            Tasarım kanvası (UrunDetay.dc.html) — "swatch" stili: küçük,
            kare köşeli (rounded-[10px]) kutular, seçiliyken border-strong
            yerine turuncu border + hafif turuncu ring (box-shadow). Eski
            tam-pill (rounded-full) stilin yerini aldı — bu sadece görsel,
            seçim/validasyon mantığı (toggleOptionValue) DEĞİŞMEDİ.
          */}
          <div role="radiogroup" aria-label={group.name} className="mt-2 flex flex-wrap gap-2.5">
            {group.values.map((value) => {
              const isSelected = selectedOptionValueIdByGroup[group.id] === value.id;
              const swatch = getColorSwatch(value.value);
              return (
                <button
                  key={value.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => toggleOptionValue(group.id, value.id)}
                  style={isSelected ? { boxShadow: "0 0 0 2px rgba(217,95,0,0.25)" } : undefined}
                  className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-3 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-[#D95F00] bg-[#171717] text-[#F5F5F5]"
                      : "border-[#3A3A3A] bg-[#171717] text-[#A3A3A3] hover:border-[#D95F00] hover:text-[#F5F5F5]"
                  }`}
                >
                  {swatch ? (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/25"
                      style={{ backgroundColor: swatch }}
                      aria-hidden="true"
                    />
                  ) : null}
                  {value.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {addons.length > 0 ? (
        <div className="mt-7">
          <p className="text-sm font-medium text-[#F5F5F5]">Ek Ürün Alanları</p>
          <ul className="mt-2 space-y-2">
            {addons.map((addon) => {
              const isRequired = requiredAddonIds.has(addon.id);
              const isChecked = selectedAddonIds.includes(addon.id);
              const disabled = isRequired || (!addon.inStock && !isChecked);
              return (
                <li key={addon.id}>
                  <label
                    htmlFor={`addon-${addon.id}`}
                    className={`flex items-center gap-3 rounded-[14px] border p-3 text-sm transition-colors ${
                      isChecked ? "border-[#D95F00] bg-[#D95F00]/10" : "border-[#292929] bg-[#171717]"
                    } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#D95F00]"}`}
                  >
                    <input
                      id={`addon-${addon.id}`}
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={() => toggleAddon(addon.id)}
                      className={`rounded ${storefrontRadioClasses} disabled:cursor-not-allowed`}
                    />
                    <span className="flex-1 text-[#F5F5F5]">
                      {addon.name} <span className="text-[#A3A3A3]">(+{formatPrice(addon.priceDelta)})</span>
                      {isRequired ? <span className="ml-1.5 text-xs text-[#A3A3A3]">(zorunlu)</span> : null}
                      {!addon.inStock && !isRequired ? <span className="ml-1.5 text-xs text-red-400">Tükendi</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border-[1.5px] border-[#3A3A3A]">
          <button
            type="button"
            aria-label="Adedi azalt"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-1.5 text-sm text-[#A3A3A3] hover:text-[#F5F5F5]"
          >
            −
          </button>
          <span className="min-w-[2ch] px-2 text-center text-sm text-[#F5F5F5]">{quantity}</span>
          <button
            type="button"
            aria-label="Adedi artır"
            onClick={() => setQuantity((q) => q + 1)}
            className="px-3 py-1.5 text-sm text-[#A3A3A3] hover:text-[#F5F5F5]"
          >
            +
          </button>
        </div>

        <button type="button" disabled={!canAddToCart} onClick={handleAddToCart} className={storefrontButtonClasses}>
          {justAdded ? "Sepete Eklendi ✓" : "Sepete Ekle"}
        </button>
      </div>

      {needsSelection ? <p className="mt-2 text-xs text-[#A3A3A3]">Devam etmek için yukarıdan bir seçenek seçin.</p> : null}
      {selectionOutOfStock ? <p className="mt-2 text-xs text-red-400">Bu seçenek şu an stokta yok.</p> : null}
    </div>
  );
}
