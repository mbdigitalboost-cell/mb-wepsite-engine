"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { initialCategoryFormState, type CategoryFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_VALUES: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  parentId: "",
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

interface CategoryOption {
  id: string;
  name: string;
}

interface CategoryFormProps {
  initialValues?: CategoryFormValues;
  initialIsActive?: boolean;
  /** Other categories in this store, for the parent-category select. Excludes the category being edited (a category cannot be its own parent). */
  parentOptions: CategoryOption[];
  action: (prevState: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  submitLabel: string;
}

/**
 * FAZ 2B — Categories. Same shared create+update shape as brands/brand-form.tsx.
 * Fields are exactly lib/validation/category.ts's categoryFormSchema:
 * name, slug, description, imageUrl, parentId, sortOrder, isActive,
 * seoTitle, seoDescription. store_id is deliberately NOT a field here —
 * tenant scope is bound into the `action` prop by the caller
 * (categories/page.tsx). sortOrder is a plain number input (not
 * navigation's up/down buttons) — matches content-form.tsx's convention,
 * per FAZ 2B's own direction for the products form.
 */
export function CategoryForm({
  initialValues = EMPTY_VALUES,
  initialIsActive = true,
  parentOptions,
  action,
  submitLabel,
}: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, initialCategoryFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Kategori Adı
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

      <div>
        <label htmlFor={`${formId}-slug`} className="mb-1.5 block text-sm font-medium text-foreground">
          Slug
        </label>
        <input
          id={`${formId}-slug`}
          name="slug"
          type="text"
          required
          defaultValue={initialValues.slug}
          placeholder="kategori-adi"
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
          rows={3}
          defaultValue={initialValues.description}
          className={inputClasses}
        />
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
          placeholder="https://..."
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-parentId`} className="mb-1.5 block text-sm font-medium text-foreground">
          Üst Kategori <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <select
          id={`${formId}-parentId`}
          name="parentId"
          defaultValue={initialValues.parentId}
          className={inputClasses}
        >
          <option value="">— Yok —</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
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
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initialIsActive}
          className="h-4 w-4 rounded border-black/20"
        />
        Aktif
      </label>

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
