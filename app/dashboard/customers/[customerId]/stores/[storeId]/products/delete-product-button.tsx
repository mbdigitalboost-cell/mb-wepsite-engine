"use client";

import { useRef } from "react";

interface DeleteProductButtonProps {
  productName: string;
  action: () => Promise<void>;
}

/**
 * FAZ 2B — the first window.confirm() dialog in this codebase. Every other
 * permanent delete here (navigation item, brand, category) is a single
 * "Sil" click with no confirmation, because nothing else cascades from
 * those deletes. Deleting a product is different: option_groups/
 * option_values/product_variants/product_images/variant_option_values all
 * reference it with `on delete cascade` (migrations 0018/0019) — a
 * misclick here takes a much larger amount of data with it, which is
 * worth one extra client-side confirmation step before the server action
 * (deleteProductAction, store_admin+ only) ever runs.
 */
export function DeleteProductButton({ productName, action }: DeleteProductButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `"${productName}" ürününü kalıcı olarak silmek üzeresiniz. Bu ürüne bağlı tüm varyantlar, görseller ve seçenekler de silinecek. Bu işlem geri alınamaz. Devam edilsin mi?`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <button type="submit" className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline">
        Kalıcı Olarak Sil
      </button>
    </form>
  );
}
