"use client";

interface DeleteVariantButtonProps {
  variantName: string;
  action: () => Promise<void>;
}

/**
 * FAZ 2C-2 — same window.confirm() pattern as products' own
 * DeleteProductButton: variant_option_values CASCADE from a variant
 * delete, and product_images.variant_id is SET NULL for any photo
 * scoped to this variant (migration 0019) — a misclick here silently
 * un-scopes photos and drops all option-value assignments, worth one
 * extra confirmation.
 */
export function DeleteVariantButton({ variantName, action }: DeleteVariantButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `"${variantName}" varyantını kalıcı olarak silmek üzeresiniz. Bu varyanta bağlı seçenek atamaları silinecek ve bu varyanta özel görseller genel ürün görseline dönecek. Bu işlem geri alınamaz. Devam edilsin mi?`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <button type="submit" className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline">
        Varyantı Kalıcı Olarak Sil
      </button>
    </form>
  );
}
