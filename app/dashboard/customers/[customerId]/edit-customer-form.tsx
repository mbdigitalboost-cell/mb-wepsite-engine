"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { updateCustomerAction } from "../actions";
import { initialCustomerFormState } from "../form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface EditCustomerFormProps {
  customerId: string;
  initialValues: { name: string; slug: string };
}

export function EditCustomerForm({ customerId, initialValues }: EditCustomerFormProps) {
  const action = updateCustomerAction.bind(null, customerId);
  const [state, formAction, pending] = useActionState(action, initialCustomerFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Müşteri Adı
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
