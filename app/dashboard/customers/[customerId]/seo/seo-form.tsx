"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import { saveSeoAction } from "./actions";
import { initialSeoFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface SeoFormProps {
  customerId: string;
  seoId: string | null;
  /** Faz 6F-4A-3.2: null = site-wide (route_key IS NULL), dolu = statik sayfa override. */
  routeKey: string | null;
  initialValues: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
  };
}

export function SeoForm({ customerId, seoId, routeKey, initialValues }: SeoFormProps) {
  const action = saveSeoAction.bind(null, customerId, seoId);
  const [state, formAction, pending] = useActionState(action, initialSeoFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {/* Faz 6F-4A-3.2: hangi kaydın düzenlendiği (site-wide mi, hangi
          statik sayfa mı) — sekme seçimiyle (page.tsx'in ?route= linki)
          zaten belirleniyor, form sadece bunu action'a taşıyor. Boş
          değer = site-wide, seoFormSchema bunu registry'ye karşı
          doğruluyor. */}
      <input type="hidden" name="routeKey" value={routeKey ?? ""} />
      <div>
        <label htmlFor={`${formId}-title`} className="mb-1.5 block text-sm font-medium text-foreground">
          Title
        </label>
        <input id={`${formId}-title`} name="title" type="text" defaultValue={initialValues.title} className={inputClasses} />
      </div>
      <div>
        <label htmlFor={`${formId}-description`} className="mb-1.5 block text-sm font-medium text-foreground">
          Description
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
        <label htmlFor={`${formId}-canonical`} className="mb-1.5 block text-sm font-medium text-foreground">
          Canonical URL
        </label>
        <input id={`${formId}-canonical`} name="canonical" type="text" defaultValue={initialValues.canonical} className={inputClasses} />
      </div>
      <ImageUploadField
        customerId={customerId}
        folder="brand"
        name="ogImage"
        label="OG Image"
        defaultValue={initialValues.ogImage}
      />

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="robotsIndex" defaultChecked={initialValues.robotsIndex} />
          robots: index
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="robotsFollow" defaultChecked={initialValues.robotsFollow} />
          robots: follow
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </form>
  );
}
