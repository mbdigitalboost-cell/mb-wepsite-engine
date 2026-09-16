"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { initialBrandFormState, type BrandFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface BrandFormValues {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_VALUES: BrandFormValues = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  seoTitle: "",
  seoDescription: "",
};

interface BrandFormProps {
  initialValues?: BrandFormValues;
  initialIsActive?: boolean;
  action: (prevState: BrandFormState, formData: FormData) => Promise<BrandFormState>;
  submitLabel: string;
}

/**
 * FAZ 2B — Brands. ONE shared form for both create (brands/page.tsx's "Yeni
 * Marka" section) and inline edit (brands/page.tsx's per-row <details>) —
 * same "one generic form, driven by props, bound Server Action decides
 * create vs update" shape as content-form.tsx. Pending label is always
 * "Kaydediliyor..." (matching content-form.tsx's shared-component
 * convention) — "Ekleniyor..." is only used by navigation's *separate*
 * create-only AddItemForm, which doesn't apply here since this one
 * component serves both.
 *
 * Fields are exactly lib/validation/brand.ts's brandFormSchema, no more no
 * less: name, slug, description, logoUrl, isActive, seoTitle,
 * seoDescription. storeId/store_id is deliberately NOT a field here (see
 * that schema's own comment) — tenant scope is bound into the `action`
 * prop by the caller (brands/page.tsx), never submitted by this form.
 */
export function BrandForm({
  initialValues = EMPTY_VALUES,
  initialIsActive = true,
  action,
  submitLabel,
}: BrandFormProps) {
  const [state, formAction, pending] = useActionState(action, initialBrandFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Marka Adı
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
          placeholder="marka-adi"
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
        <label htmlFor={`${formId}-logoUrl`} className="mb-1.5 block text-sm font-medium text-foreground">
          Logo URL <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-logoUrl`}
          name="logoUrl"
          type="text"
          defaultValue={initialValues.logoUrl}
          placeholder="https://..."
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
