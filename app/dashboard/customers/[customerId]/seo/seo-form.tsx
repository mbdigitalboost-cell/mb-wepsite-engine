"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { saveSeoAction } from "./actions";
import { initialSeoFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface SeoFormProps {
  customerId: string;
  seoId: string | null;
  initialValues: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
  };
}

export function SeoForm({ customerId, seoId, initialValues }: SeoFormProps) {
  const action = saveSeoAction.bind(null, customerId, seoId);
  const [state, formAction, pending] = useActionState(action, initialSeoFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
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
      <div>
        <label htmlFor={`${formId}-ogImage`} className="mb-1.5 block text-sm font-medium text-foreground">
          OG Image URL
        </label>
        <input id={`${formId}-ogImage`} name="ogImage" type="text" defaultValue={initialValues.ogImage} className={inputClasses} />
      </div>

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
