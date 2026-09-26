"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { initialProductFormState, type ProductFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface ProductFormValues {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  models: string[];
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId: string;
  price: number;
  compareAtPrice: number | "";
  stock: number;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_VALUES: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  barcode: "",
  models: [],
  shortDescription: "",
  description: "",
  categoryId: "",
  brandId: "",
  price: 0,
  compareAtPrice: "",
  stock: 0,
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

interface RelationOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  initialValues?: ProductFormValues;
  initialTrackInventory?: boolean;
  initialIsActive?: boolean;
  categoryOptions: RelationOption[];
  brandOptions: RelationOption[];
  /** FAZ 9 — brandId -> previously-used models in this store (lib/commerce/product-models-by-brand.ts), used only for the "önceden kullanılmış modeller" suggestion chips below — never enforced as a fixed list. */
  modelsByBrand: Record<string, string[]>;
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  submitLabel: string;
}

/**
 * FAZ 2B — Products. One shared form for create (products/new/page.tsx)
 * and update (products/[productId]/page.tsx) — same "one generic form,
 * bound Server Action decides create vs update" shape as
 * content-form.tsx/brand-form.tsx/category-form.tsx. Fields are exactly
 * lib/validation/product.ts's productFormSchema. sortOrder is a plain
 * number input, NOT navigation's up/down reorder buttons (per FAZ 2B's
 * own direction — content-form.tsx's convention instead). store_id is
 * deliberately NOT a field here — tenant scope is bound into the `action`
 * prop by the caller.
 *
 * FAZ 9 — `models` (was a single text input) is now a tag list: type a
 * value and press Enter/"Ekle", or click a suggestion chip drawn from
 * `modelsByBrand[brandId]` (this brand's previously-used models in this
 * store). Each tag renders its own hidden `<input name="models">` so
 * `formData.getAll("models")` on the server collects the whole list — no
 * client-side JSON serialization needed. Still fully free text: a
 * suggestion is a convenience, never a constraint (typing a brand-new
 * model name works exactly the same as clicking a suggestion).
 */
export function ProductForm({
  initialValues = EMPTY_VALUES,
  initialTrackInventory = true,
  initialIsActive = true,
  categoryOptions,
  brandOptions,
  modelsByBrand,
  action,
  submitLabel,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, initialProductFormState);
  const formId = useId();

  const [models, setModels] = useState<string[]>(initialValues.models);
  const [modelInput, setModelInput] = useState("");
  // Mirrors the brand <select> below (which stays uncontrolled via
  // defaultValue, like every other field in this form) purely so the model
  // suggestion list can react to a brand change — this state never drives
  // the select's own displayed value.
  const [brandId, setBrandId] = useState(initialValues.brandId);

  const suggestions = useMemo(() => {
    const usedForBrand = modelsByBrand[brandId] ?? [];
    return usedForBrand.filter((model) => !models.includes(model));
  }, [modelsByBrand, brandId, models]);

  function addModel(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setModels((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setModelInput("");
  }

  function removeModel(value: string) {
    setModels((prev) => prev.filter((model) => model !== value));
  }

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
            Ürün Adı
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            required
            defaultValue={initialValues.name}
            className={inputClasses}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor={`${formId}-slug`} className="mb-1.5 block text-sm font-medium text-foreground">
            Slug
          </label>
          <input
            id={`${formId}-slug`}
            name="slug"
            type="text"
            required
            defaultValue={initialValues.slug}
            placeholder="urun-adi"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[150px]">
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
        <div className="flex-1 min-w-[150px]">
          <label htmlFor={`${formId}-barcode`} className="mb-1.5 block text-sm font-medium text-foreground">
            Barkod <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-barcode`}
            name="barcode"
            type="text"
            defaultValue={initialValues.barcode}
            placeholder="ör. 8699xxxxxxxxx"
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-modelInput`} className="mb-1.5 block text-sm font-medium text-foreground">
          Modeller <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <div className="flex gap-2">
          <input
            id={`${formId}-modelInput`}
            type="text"
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addModel(modelInput);
              }
            }}
            placeholder="ör. TP9 — yazıp Enter'a basın veya Ekle'ye tıklayın"
            className={inputClasses}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => addModel(modelInput)}>
            Ekle
          </Button>
        </div>

        {models.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {models.map((model) => (
              <li
                key={model}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs text-foreground"
              >
                <input type="hidden" name="models" value={model} />
                {model}
                <button
                  type="button"
                  onClick={() => removeModel(model)}
                  aria-label={`${model} modelini kaldır`}
                  className="text-foreground/40 hover:text-red-600"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs text-foreground/50">Bu markada daha önce kullanılmış modeller:</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {suggestions.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => addModel(model)}
                  className="rounded-full border border-black/10 px-3 py-1 text-xs text-foreground/70 transition-colors hover:border-black/20 hover:bg-brand-accent/5"
                >
                  + {model}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-shortDescription`} className="mb-1.5 block text-sm font-medium text-foreground">
          Kısa Açıklama <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-shortDescription`}
          name="shortDescription"
          type="text"
          defaultValue={initialValues.shortDescription}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-description`} className="mb-1.5 block text-sm font-medium text-foreground">
          Açıklama <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <textarea
          id={`${formId}-description`}
          name="description"
          rows={4}
          defaultValue={initialValues.description}
          className={inputClasses}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor={`${formId}-categoryId`} className="mb-1.5 block text-sm font-medium text-foreground">
            Kategori <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <select
            id={`${formId}-categoryId`}
            name="categoryId"
            defaultValue={initialValues.categoryId}
            className={inputClasses}
          >
            <option value="">— Yok —</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor={`${formId}-brandId`} className="mb-1.5 block text-sm font-medium text-foreground">
            Marka <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <select
            id={`${formId}-brandId`}
            name="brandId"
            defaultValue={initialValues.brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className={inputClasses}
          >
            <option value="">— Yok —</option>
            {brandOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[150px]">
          <label htmlFor={`${formId}-price`} className="mb-1.5 block text-sm font-medium text-foreground">
            Fiyat
          </label>
          <input
            id={`${formId}-price`}
            name="price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={initialValues.price}
            className={inputClasses}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
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
        <div className="flex-1 min-w-[150px]">
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

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="trackInventory"
            defaultChecked={initialTrackInventory}
            className="h-4 w-4 rounded border-black/20"
          />
          Stok Takibi
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initialIsActive}
            className="h-4 w-4 rounded border-black/20"
          />
          Aktif
        </label>
      </div>

      <div>
        <label htmlFor={`${formId}-seoTitle`} className="mb-1.5 block text-sm font-medium text-foreground">
          SEO Başlık <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-seoTitle`}
          name="seoTitle"
          type="text"
          defaultValue={initialValues.seoTitle}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-seoDescription`} className="mb-1.5 block text-sm font-medium text-foreground">
          SEO Açıklama <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <textarea
          id={`${formId}-seoDescription`}
          name="seoDescription"
          rows={2}
          defaultValue={initialValues.seoDescription}
          className={inputClasses}
        />
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
