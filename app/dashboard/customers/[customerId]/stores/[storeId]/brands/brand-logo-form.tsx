"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { initialBrandLogoFormState, type BrandLogoFormState } from "./form-state";

/**
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C — marka
 * logosu yükleme. lib/commerce/upload-store-branding-asset.ts'in Faz 10
 * altyapısı yeniden kullanılıyor (`brands/${brandId}` asset tipi) — yeni
 * bir upload sistemi İCAT EDİLMEDİ.
 */
export function BrandLogoForm({
  currentLogoUrl,
  brandName,
  action,
}: {
  currentLogoUrl: string | null;
  brandName: string;
  action: (prevState: BrandLogoFormState, formData: FormData) => Promise<BrandLogoFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialBrandLogoFormState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      {currentLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- store-branding public bucket URL (Faz 10 pattern), not worth a next.config.ts remotePatterns entry for a small admin thumbnail.
        <img src={currentLogoUrl} alt={brandName} className="h-10 w-10 rounded-md border border-black/10 object-contain" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-black/15 text-[10px] text-foreground/40">
          Yok
        </div>
      )}
      <input
        type="file"
        name="logoFile"
        accept="image/jpeg,image/png,image/webp,image/gif"
        aria-label={`${brandName} logosu seç`}
        className="text-xs text-foreground/70"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Yükleniyor..." : "Logo Yükle"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
