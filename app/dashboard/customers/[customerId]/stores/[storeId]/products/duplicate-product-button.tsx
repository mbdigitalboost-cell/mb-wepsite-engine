interface DuplicateProductButtonProps {
  action: () => Promise<void>;
}

/**
 * FAZ 2B-P1 — Ürün kopyalama butonu.
 *
 * KENDİ <form>'unu SARMIYOR (delete-product-button.tsx'ten farkı budur):
 * bu buton, products/page.tsx'teki toplu-işlem <form>'unun İÇİNDE render
 * ediliyor (her satır zaten o formun bir parçası, çünkü toplu seçim
 * checkbox'ları da orada) — HTML'de <form> içine başka bir <form>
 * yerleştirmek geçersizdir (nested forms). Bunun yerine React/Next.js'in
 * "aynı formda birden fazla server action" deseni kullanılıyor: bu
 * buton `type="submit" formAction={action}` ile, tıklandığında formun
 * KENDİ varsayılan action'ı (bulkUpdateProductsAction) yerine SADECE bu
 * `action`'ı (duplicateProductAction, zaten productId'ye bind'lenmiş)
 * tetikler — çevresindeki checkbox'ları etkilemez.
 *
 * window.confirm() İÇERMİYOR ve "use client" gerektirmiyor —
 * toggleProductActiveAction gibi geri alınabilir/zararsız bir işlem
 * (kopya kendi bağımsız, varsayılan olarak PASİF satırı; hiçbir mevcut
 * veriyi değiştirmez veya silmez), bu yüzden ekstra bir onay adımına
 * gerek yok.
 */
export function DuplicateProductButton({ action }: DuplicateProductButtonProps) {
  return (
    <button
      type="submit"
      formAction={action}
      className="shrink-0 rounded px-2 py-1 text-xs text-foreground/70 underline-offset-2 hover:underline"
    >
      Kopyala
    </button>
  );
}
