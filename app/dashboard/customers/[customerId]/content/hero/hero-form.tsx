"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import { saveHeroAction } from "./actions";
import { initialHeroFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface HeroFormProps {
  customerId: string;
  heroId: string | null;
  initialValues: {
    heading: string;
    subtext: string;
    ctaPrimaryLabel: string;
    ctaPrimaryHref: string;
    ctaSecondaryLabel: string;
    ctaSecondaryHref: string;
    backgroundImage: string;
  };
}

export function HeroForm({ customerId, heroId, initialValues }: HeroFormProps) {
  const action = saveHeroAction.bind(null, customerId, heroId);
  const [state, formAction, pending] = useActionState(action, initialHeroFormState);
  const formId = useId();

  const field = (name: keyof typeof initialValues, label: string, textarea = false) => (
    <div key={name}>
      <label htmlFor={`${formId}-${name}`} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={`${formId}-${name}`}
          name={name}
          rows={3}
          defaultValue={initialValues[name]}
          className={inputClasses}
        />
      ) : (
        <input id={`${formId}-${name}`} name={name} type="text" defaultValue={initialValues[name]} className={inputClasses} />
      )}
    </div>
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {field("heading", "Başlık (heading)")}
      {field("subtext", "Alt metin (subtext)", true)}
      {field("ctaPrimaryLabel", "Ana CTA etiketi")}
      {field("ctaPrimaryHref", "Ana CTA linki")}
      {field("ctaSecondaryLabel", "İkincil CTA etiketi")}
      {field("ctaSecondaryHref", "İkincil CTA linki")}

      <ImageUploadField
        customerId={customerId}
        folder="hero"
        name="backgroundImage"
        label="Arka plan görseli"
        defaultValue={initialValues.backgroundImage}
      />

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : heroId ? "Değişiklikleri Kaydet" : "Taslak Olarak Oluştur"}
      </Button>
    </form>
  );
}
