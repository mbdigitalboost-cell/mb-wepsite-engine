"use client";

import { useActionState, useId, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { initialProductAddonFormState, type ProductAddonFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface ProductAddonFormValues {
  name: string;
  sku: string;
  priceDelta: number;
  stock: number | "";
  trackInventory: boolean;
  imageUrl: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_VALUES: ProductAddonFormValues = {
  name: "",
  sku: "",
  priceDelta: 0,
  stock: "",
  trackInventory: true,
  imageUrl: "",
  isRequired: false,
  isActive: true,
  sortOrder: 0,
};

interface ProductAddonFormProps {
  /** Ana ürünün (veya varsa seçili varyantın) fiyatı — SADECE toplam önizleme metni için, hiçbir şekilde sunucuya gönderilmez/gerçek fiyat hesabında kullanılmaz. */
  basePrice: number;
  initialValues?: ProductAddonFormValues;
  action: (prevState: ProductAddonFormState, formData: FormData) => Promise<ProductAddonFormState>;
  submitLabel: string;
}

/**
 * FAZ 2C-2 — Product Add-on (ör. "Yan Cep +100") create/update, shared
 * form — aynı "one generic form, bound Server Action decides create vs
 * update" şekli.
 *
 * priceDelta ÖNİZLEMESİ: aşağıdaki "Toplam önizleme" satırı SADECE
 * `basePrice + priceDelta`'yı admin'e göstermek için yerel bir
 * `useState` kullanır — bu asla forma gizli bir "total" alanı olarak
 * eklenmez ve formAction'a GÖNDERİLMEZ (bkz. addons/actions.ts'in
 * kendi CRITICAL yorumu: sunucu sadece `priceDelta`'yı DB'ye yazar,
 * hiçbir "total" alanını asla kabul etmez). Gerçek bir sepet/sipariş
 * akışı geldiğinde toplam fiyat orada YENİDEN, sunucu tarafında
 * hesaplanacak — bu önizleme yalnızca admin'in "bu ek parçayı
 * eklediğimde müşteri ne görecek" sorusuna hızlı bir fikir vermesi için.
 */
export function ProductAddonForm({ basePrice, initialValues = EMPTY_VALUES, action, submitLabel }: ProductAddonFormProps) {
  const [state, formAction, pending] = useActionState(action, initialProductAddonFormState);
  const formId = useId();
  const [priceDeltaPreview, setPriceDeltaPreview] = useState(initialValues.priceDelta);

  function handlePriceDeltaChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(event.target.value);
    setPriceDeltaPreview(Number.isFinite(parsed) ? parsed : 0);
  }

  const currency = (value: number) => value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Adı
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          required
          defaultValue={initialValues.name}
          placeholder="Yan Cep"
          className={inputClasses}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[160px] flex-1">
          <label htmlFor={`${formId}-sku`} className="mb-1.5 block text-sm font-medium text-foreground">
            SKU <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <input id={`${formId}-sku`} name="sku" type="text" defaultValue={initialValues.sku} className={inputClasses} />
        </div>
        <div className="min-w-[150px] flex-1">
          <label htmlFor={`${formId}-priceDelta`} className="mb-1.5 block text-sm font-medium text-foreground">
            Fiyat Farkı
          </label>
          <input
            id={`${formId}-priceDelta`}
            name="priceDelta"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initialValues.priceDelta}
            onChange={handlePriceDeltaChange}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-foreground/50">Bu tutar ana ürün/varyant fiyatına eklenir.</p>
        </div>
        <div className="min-w-[130px] flex-1">
          <label htmlFor={`${formId}-stock`} className="mb-1.5 block text-sm font-medium text-foreground">
            Stok <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-stock`}
            name="stock"
            type="number"
            min={0}
            defaultValue={initialValues.stock}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-foreground/50">Boş bırakılırsa stok takip edilmez.</p>
        </div>
      </div>

      <div className="rounded-md border border-black/10 bg-black/[.02] px-4 py-3 text-xs text-foreground/70">
        Ana ürün {currency(basePrice)} + Ek parça {priceDeltaPreview >= 0 ? "+" : ""}
        {currency(priceDeltaPreview)} = Toplam önizleme {currency(basePrice + priceDeltaPreview)}
        <p className="mt-1 text-foreground/40">
          Bu sadece admin önizlemesidir — gerçek fiyat, sepete ekleme akışı geldiğinde sunucu tarafında ayrıca
          hesaplanacaktır.
        </p>
      </div>

      <div>
        <label htmlFor={`${formId}-imageUrl`} className="mb-1.5 block text-sm font-medium text-foreground">
          Görsel URL <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-imageUrl`}
          name="imageUrl"
          type="text"
          defaultValue={initialValues.imageUrl}
          placeholder="/images/yan-cep.png veya https://..."
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

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="trackInventory"
            defaultChecked={initialValues.trackInventory}
            className="h-4 w-4 rounded border-black/20"
          />
          Stok Takibi
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="isRequired"
            defaultChecked={initialValues.isRequired}
            className="h-4 w-4 rounded border-black/20"
          />
          Zorunlu
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initialValues.isActive}
            className="h-4 w-4 rounded border-black/20"
          />
          Aktif
        </label>
      </div>

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
