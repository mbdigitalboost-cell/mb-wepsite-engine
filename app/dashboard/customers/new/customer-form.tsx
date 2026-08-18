"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { createCustomerAction } from "../actions";
import { initialCustomerFormState } from "../form-state";
import { inputClasses } from "@/lib/utils/input-classes";

export function CustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomerAction, initialCustomerFormState);
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
          placeholder="Petra Mühendislik"
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
          placeholder="petra-muhendislik"
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">
          Küçük harf, rakam ve tire (-) — panelde ve gelecekte URL&apos;lerde kullanılır.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Oluşturuluyor..." : "Müşteri Oluştur"}
      </Button>
    </form>
  );
}
