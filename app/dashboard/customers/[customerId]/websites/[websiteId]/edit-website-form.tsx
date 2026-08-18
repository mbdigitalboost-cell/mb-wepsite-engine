"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { updateWebsiteAction } from "../actions";
import { initialWebsiteFormState } from "../form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface EditWebsiteFormProps {
  customerId: string;
  websiteId: string;
  initialValues: {
    name: string;
    slug: string;
    domain: string | null;
    template: string | null;
    supabaseConnectionKey: string;
  };
}

export function EditWebsiteForm({ customerId, websiteId, initialValues }: EditWebsiteFormProps) {
  const action = updateWebsiteAction.bind(null, customerId, websiteId);
  const [state, formAction, pending] = useActionState(action, initialWebsiteFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Website Adı
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
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-domain`} className="mb-1.5 block text-sm font-medium text-foreground">
          Domain <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-domain`}
          name="domain"
          type="text"
          defaultValue={initialValues.domain ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-template`} className="mb-1.5 block text-sm font-medium text-foreground">
          Şablon <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-template`}
          name="template"
          type="text"
          defaultValue={initialValues.template ?? ""}
          className={inputClasses}
        />
      </div>

      <div>
        <label
          htmlFor={`${formId}-connectionKey`}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Supabase Connection Key
        </label>
        <input
          id={`${formId}-connectionKey`}
          name="supabaseConnectionKey"
          type="text"
          required
          defaultValue={initialValues.supabaseConnectionKey}
          className={inputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
      </Button>
    </form>
  );
}
