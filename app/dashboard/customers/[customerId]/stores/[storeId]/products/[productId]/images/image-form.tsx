"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { initialProductImageFormState, type ProductImageFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface ProductImageFormValues {
  storagePath: string;
  altText: string;
  sortOrder: number;
}

const EMPTY_VALUES: ProductImageFormValues = {
  storagePath: "",
  altText: "",
  sortOrder: 0,
};

interface ProductImageFormProps {
  initialValues?: ProductImageFormValues;
  /** Only shown on the create form — see actions.ts's updateProductImageAction doc comment for why edit never touches this flag. */
  showIsPrimary?: boolean;
  action: (prevState: ProductImageFormState, formData: FormData) => Promise<ProductImageFormState>;
  submitLabel: string;
}

/**
 * FAZ 2C-1 — Product Images, shared create+update form (brand-form.tsx/
 * category-form.tsx'in AYNI deseni). `storagePath` düz bir metin alanı,
 * bir dosya seçici DEĞİL — bu fazda gerçek bir upload akışı yok (bkz. FAZ
 * 2C-1 raporu §Storage architecture): Central Platform'un (stores tenant
 * mimarisi) kendine ait bir Storage bucket/upload helper'ı henüz yok,
 * mevcut tek upload altyapısı (lib/media/upload-customer-image.ts,
 * ImageUploadField) Petra'nın PER-CUSTOMER bağlantısını kullanıyor
 * (loadCustomerConnection) — bu route için KULLANILAMAZ. brands/
 * categories'in logoUrl/imageUrl alanları da aynı nedenle düz metin
 * input'u; bu form o kararı birebir sürdürüyor.
 *
 * variantId formda YOK — henüz bir Variant CRUD/seçici olmadığından
 * (FAZ 2C-1 kapsamı dışı), uydurma bir seçici eklemek yerine alan
 * tamamen atlandı; şema/action zaten variantId'yi kabul ediyor (null =
 * genel ürün görseli), gelecekteki Variant CRUD fazı bu formu genişletip
 * bir <select> ekleyebilir.
 */
export function ProductImageForm({
  initialValues = EMPTY_VALUES,
  showIsPrimary = false,
  action,
  submitLabel,
}: ProductImageFormProps) {
  const [state, formAction, pending] = useActionState(action, initialProductImageFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-storagePath`} className="mb-1.5 block text-sm font-medium text-foreground">
          Depolama Yolu (Storage Path)
        </label>
        <input
          id={`${formId}-storagePath`}
          name="storagePath"
          type="text"
          required
          defaultValue={initialValues.storagePath}
          placeholder="products/urun-adi/gorsel-1.jpg"
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">
          Bir public URL değil, Supabase Storage bucket path&apos;i (ör. dosya yükleme bu fazda henüz yok).
        </p>
      </div>

      <div>
        <label htmlFor={`${formId}-altText`} className="mb-1.5 block text-sm font-medium text-foreground">
          Alt Metin <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-altText`}
          name="altText"
          type="text"
          defaultValue={initialValues.altText}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-sortOrder`} className="mb-1.5 block text-sm font-medium text-foreground">
          Sıralama
        </label>
        <input
          id={`${formId}-sortOrder`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues.sortOrder}
          className={inputClasses}
        />
      </div>

      {showIsPrimary ? (
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" name="isPrimary" className="h-4 w-4 rounded border-black/20" />
          Birincil görsel yap
        </label>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Kaydediliyor..." : submitLabel}
      </Button>
    </form>
  );
}
