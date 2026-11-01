"use client";

import { useRef } from "react";

interface DeleteProductButtonProps {
  productName: string;
  /** order_items satır sayısı (lib/commerce/product-order-history.ts, canlı sorgudan) — 0'dan büyükse buton tıklanamaz hale gelir. */
  orderCount: number;
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
 *
 * Admin Panel İşlevsellik devir metni, Kısım A — koşullu silme. Bu
 * bileşen artık `orderCount`'u sorup kendi kararını veriyor: sıfırsa
 * yukarıdaki eski akış değişmeden çalışır; sıfırdan büyükse buton hiç
 * submit edilemez (disabled, form bile render edilmiyor) ve yanında bir
 * ⓘ ikonu gerçek sayıyı açıklıyor — kullanıcı artık "tıkladım ama hiçbir
 * şey olmadı" durumuna hiç düşmüyor, çünkü düşemeyeceğini önceden görüyor.
 */
export function DeleteProductButton({ productName, orderCount, action }: DeleteProductButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  if (orderCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/40">
        <button type="button" disabled aria-disabled="true" className="cursor-not-allowed rounded px-2 py-1">
          Kalıcı Olarak Sil
        </button>
        <span
          title={`Bu ürün ${orderCount} siparişte geçtiği için kalıcı silinemez, sipariş geçmişi korunuyor.`}
          aria-label={`Bu ürün ${orderCount} siparişte geçtiği için kalıcı silinemez, sipariş geçmişi korunuyor.`}
          className="cursor-help text-foreground/50"
        >
          ⓘ
        </span>
      </span>
    );
  }

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
