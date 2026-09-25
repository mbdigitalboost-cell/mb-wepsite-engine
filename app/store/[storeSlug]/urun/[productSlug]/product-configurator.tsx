"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/format-price";
import { computeConfiguredPrice, resolveRequiredAddonIds } from "@/lib/commerce/pricing";
import { useCart, makeCartLineId } from "@/components/commerce/public/cart/cart-context";
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
    <div className="mt-4">
      <div className="flex items-baseline gap-3">
        <span className="text-xl font-semibold text-foreground">{formatPrice(priced.totalPrice)}</span>
        {priced.baseCompareAtPrice ? (
          <span className="text-sm text-foreground/40 line-through">{formatPrice(priced.baseCompareAtPrice)}</span>
        ) : null}
      </div>

      {optionGroups.map((group) => (
        <div key={group.id} className="mt-4">
          <p className="text-sm font-medium text-foreground">{group.name}</p>
          <div role="radiogroup" aria-label={group.name} className="mt-1.5 flex flex-wrap gap-2">
            {group.values.map((value) => {
              const isSelected = selectedOptionValueIdByGroup[group.id] === value.id;
              return (
                <button
                  key={value.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => toggleOptionValue(group.id, value.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/15 text-foreground/70 hover:border-black/30 hover:text-foreground"
                  }`}
                >
                  {value.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {addons.length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-medium text-foreground">Ek Ürün Alanları</p>
          <ul className="mt-1.5 space-y-2">
            {addons.map((addon) => {
              const isRequired = requiredAddonIds.has(addon.id);
              const isChecked = selectedAddonIds.includes(addon.id);
              const disabled = isRequired || (!addon.inStock && !isChecked);
              return (
                <li key={addon.id} className="flex items-center gap-2 text-sm">
                  <input
                    id={`addon-${addon.id}`}
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled}
                    onChange={() => toggleAddon(addon.id)}
                    className="h-4 w-4 rounded border-black/20 disabled:cursor-not-allowed"
                  />
                  <label
                    htmlFor={`addon-${addon.id}`}
                    className={`flex-1 ${disabled && !isRequired ? "text-foreground/40" : "text-foreground/80"}`}
                  >
                    {addon.name} <span className="text-foreground/50">(+{formatPrice(addon.priceDelta)})</span>
                    {isRequired ? <span className="ml-1.5 text-xs text-foreground/40">(zorunlu)</span> : null}
                    {!addon.inStock && !isRequired ? <span className="ml-1.5 text-xs text-red-600">Tükendi</span> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-md border border-black/15">
          <button
            type="button"
            aria-label="Adedi azalt"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
          >
            −
          </button>
          <span className="min-w-[2ch] px-2 text-center text-sm text-foreground">{quantity}</span>
          <button
            type="button"
            aria-label="Adedi artır"
            onClick={() => setQuantity((q) => q + 1)}
            className="px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
          >
            +
          </button>
        </div>

        <Button type="button" size="md" disabled={!canAddToCart} onClick={handleAddToCart}>
          {justAdded ? "Sepete Eklendi ✓" : "Sepete Ekle"}
        </Button>
      </div>

      {needsSelection ? <p className="mt-2 text-xs text-foreground/50">Devam etmek için yukarıdan bir seçenek seçin.</p> : null}
      {selectionOutOfStock ? <p className="mt-2 text-xs text-red-600">Bu seçenek şu an stokta yok.</p> : null}
    </div>
  );
}
