"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { initialProductVariantFormState, type ProductVariantFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface ProductVariantFormValues {
  sku: string;
  name: string;
  price: number | "";
  compareAtPrice: number | "";
  stock: number;
  sortOrder: number;
}

const EMPTY_VALUES: ProductVariantFormValues = {
  sku: "",
  name: "",
  price: "",
  compareAtPrice: "",
  stock: 0,
  sortOrder: 0,
};

interface ProductVariantFormProps {
  initialValues?: ProductVariantFormValues;
  initialIsActive?: boolean;
  action: (prevState: ProductVariantFormState, formData: FormData) => Promise<ProductVariantFormState>;
  submitLabel: string;
}

/**
 * FAZ 2C-2 — Product Variant (ör. "Siyah / L") create/update, shared form
 * — same "one generic form, bound Server Action decides create vs
 * update" shape as product-form.tsx. `price` boş bırakılırsa migration
 * 0018'in kendi nullable tasarımı gereği ana ürünün fiyatı miras alınır
 * (bkz. actions.ts'in readProductVariantFormValues yorumu) — bu davranış
 * formda açıkça yazılı, sessiz bir varsayım değil.
 */
export function ProductVariantForm({
  initialValues = EMPTY_VALUES,
  initialIsActive = true,
  action,
  submitLabel,
}: ProductVariantFormProps) {
  const [state, formAction, pending] = useActionState(action, initialProductVariantFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[180px] flex-1">
          <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
            Varyant Adı
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            required
            defaultValue={initialValues.name}
            placeholder="Siyah / L"
            className={inputClasses}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label htmlFor={`${formId}-sku`} className="mb-1.5 block text-sm font-medium text-foreground">
            SKU
          </label>
          <input
            id={`${formId}-sku`}
            name="sku"
            type="text"
            required
            defaultValue={initialValues.sku}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[150px] flex-1">
          <label htmlFor={`${formId}-price`} className="mb-1.5 block text-sm font-medium text-foreground">
            Fiyat <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-price`}
            name="price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initialValues.price}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-foreground/50">Fiyat boş bırakılırsa ürün fiyatı kullanılır.</p>
        </div>
        <div className="min-w-[150px] flex-1">
          <label htmlFor={`${formId}-compareAtPrice`} className="mb-1.5 block text-sm font-medium text-foreground">
            Karşılaştırma Fiyatı <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-compareAtPrice`}
            name="compareAtPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initialValues.compareAtPrice}
            className={inputClasses}
          />
        </div>
        <div className="min-w-[120px] flex-1">
          <label htmlFor={`${formId}-stock`} className="mb-1.5 block text-sm font-medium text-foreground">
            Stok
          </label>
          <input
            id={`${formId}-stock`}
            name="stock"
            type="number"
            min={0}
            required
            defaultValue={initialValues.stock}
            className={inputClasses}
          />
        </div>
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

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input type="checkbox" name="isActive" defaultChecked={initialIsActive} className="h-4 w-4 rounded border-black/20" />
        Aktif
      </label>

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
