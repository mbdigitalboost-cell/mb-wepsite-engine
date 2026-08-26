"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { updateStoreAction } from "@/app/dashboard/stores/actions";
import { initialStoreFormState } from "@/app/dashboard/stores/form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface EditStoreFormProps {
  customerId: string;
  storeId: string;
  initialValues: { name: string; slug: string };
}

/** Admin-only (name/slug are Platform-level identity fields, see actions.ts requireAdmin()). */
export function EditStoreForm({ customerId, storeId, initialValues }: EditStoreFormProps) {
  const action = updateStoreAction.bind(null, customerId, storeId);
  const [state, formAction, pending] = useActionState(action, initialStoreFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Mağaza Adı
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
