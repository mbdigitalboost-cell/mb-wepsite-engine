"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BulkActionControlsProps {
  categories: Array<{ id: string; name: string }>;
}

/**
 * Admin Panel İşlevsellik devir metni, Kısım C — toplu işlem çubuğu artık
 * 4 seçenekli (Aktif Yap / Pasif Yap / Kategori Değiştir / Kalıcı Sil).
 * "Kategori Değiştir" seçiliyken ikinci bir <select> (hedef kategori)
 * belirir; "Kalıcı Sil" seçiliyken submit öncesi bir window.confirm()
 * devreye girer — DeleteProductButton'ın (Kısım A) AYNI uyarı deseni,
 * burada da sipariş geçmişi olan ürünlerin sessizce atlanacağı açıkça
 * belirtiliyor (gerçek atlama/silme sayımı server action'da yapılıyor,
 * bu sadece önceden uyarı).
 *
 * Bu küçük istemci adacığı, DeleteProductButton/DuplicateProductButton
 * ile AYNI mimari — çevresindeki <form action={bulkUpdateProductsAction}>
 * hâlâ products/page.tsx'in kendi Server Component'inde, SADECE bu
 * seçim/onay mantığı client tarafında.
 */
export function BulkActionControls({ categories }: BulkActionControlsProps) {
  const [action, setAction] = useState("activate");

  return (
    <>
      <select
        name="bulkAction"
        value={action}
        onChange={(event) => setAction(event.target.value)}
        className="h-8 w-auto rounded-md border border-black/15 bg-transparent px-2 text-xs text-foreground transition-colors focus-visible:border-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/20"
      >
        <option value="activate">Seçilenleri Aktif Yap</option>
        <option value="deactivate">Seçilenleri Pasif Yap</option>
        <option value="changeCategory">Seçilenlerin Kategorisini Değiştir</option>
        <option value="deleteForever">Seçilenleri Kalıcı Sil</option>
      </select>

      {action === "changeCategory" ? (
        <select
          name="bulkCategoryId"
          defaultValue=""
          className="h-8 w-auto rounded-md border border-black/15 bg-transparent px-2 text-xs text-foreground transition-colors focus-visible:border-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/20"
        >
          <option value="">Yeni kategori seçin</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      ) : null}

      <Button
        type="submit"
        size="sm"
        variant="outline"
        onClick={(event) => {
          if (action === "deleteForever") {
            const confirmed = window.confirm(
              "Seçili ürünlerden sipariş geçmişi OLMAYANLAR kalıcı olarak silinecek. Sipariş geçmişi olan ürünler otomatik atlanır ve Pasif/Aktif durumları değişmeden kalır. Devam edilsin mi?",
            );
            if (!confirmed) event.preventDefault();
          }
          if (action === "changeCategory") {
            const button = event.currentTarget as HTMLButtonElement;
            const select = button.form?.elements.namedItem("bulkCategoryId") as HTMLSelectElement | null;
            if (!select?.value) {
              event.preventDefault();
              window.alert("Önce yeni kategoriyi seçin.");
            }
          }
        }}
      >
        Uygula
      </Button>
    </>
  );
}
