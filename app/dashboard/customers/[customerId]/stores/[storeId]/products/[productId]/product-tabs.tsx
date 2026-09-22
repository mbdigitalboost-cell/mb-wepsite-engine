"use client";

import { useState, type ReactNode } from "react";

export type ProductTabKey = "basic" | "images" | "variants" | "addons";

const TAB_LABELS: Record<ProductTabKey, string> = {
  basic: "Temel Bilgiler",
  images: "Görseller",
  variants: "Varyantlar",
  addons: "Ek Ürün Alanları",
};

const TAB_ORDER: ProductTabKey[] = ["basic", "images", "variants", "addons"];

export function isProductTabKey(value: string | undefined): value is ProductTabKey {
  return value === "basic" || value === "images" || value === "variants" || value === "addons";
}

interface ProductTabsProps {
  /**
   * "create": productId doesn't exist yet, so only Temel Bilgiler is
   * usable — the other 3 tabs render locked (disabled button + "önce
   * kaydedin" note) regardless of whether content was passed for them.
   * "edit": all 4 fully usable.
   */
  mode: "create" | "edit";
  initialTab: ProductTabKey;
  basicContent: ReactNode;
  imagesContent?: ReactNode;
  variantsContent?: ReactNode;
  addonsContent?: ReactNode;
}

/**
 * Client-side tab switcher for the unified product create/edit screen.
 * Every tab's content is rendered SERVER-SIDE by the caller (page.tsx
 * composes each tab's existing content — ProductForm, the images list,
 * the option-groups/variants section, the addons list — completely
 * unchanged; see images-tab.tsx/variants-tab.tsx/addons-tab.tsx, which
 * are the original images/variants/addons page.tsx bodies moved as-is,
 * not rewritten) and handed down here as already-resolved React nodes.
 * This component only decides which one is currently visible, via local
 * state — switching tabs is a pure client-side render, never a
 * navigation/reload, and never re-fetches anything.
 */
export function ProductTabs({
  mode,
  initialTab,
  basicContent,
  imagesContent,
  variantsContent,
  addonsContent,
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<ProductTabKey>(initialTab);

  const contentByTab: Record<ProductTabKey, ReactNode> = {
    basic: basicContent,
    images: imagesContent,
    variants: variantsContent,
    addons: addonsContent,
  };

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-black/10">
        {TAB_ORDER.map((tab) => {
          const locked = mode === "create" && tab !== "basic";
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={locked}
              onClick={locked ? undefined : () => setActiveTab(tab)}
              title={locked ? "Önce ürünü kaydedin" : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-brand-accent text-foreground"
                  : locked
                    ? "cursor-not-allowed border-transparent text-foreground/30"
                    : "border-transparent text-foreground/50 hover:text-foreground"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === "basic" || mode === "edit" ? (
          contentByTab[activeTab]
        ) : (
          <p className="text-sm text-foreground/50">
            {TAB_LABELS[activeTab]} eklemek için önce ürünü kaydedin — kaydettikten sonra buradan devam
            edebilirsiniz.
          </p>
        )}
      </div>
    </div>
  );
}
