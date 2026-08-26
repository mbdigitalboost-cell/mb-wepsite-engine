"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { createStoreAction } from "../actions";
import { initialStoreFormState } from "../form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface StoreFormProps {
  customers: { id: string; name: string }[];
}

/**
 * `customerId` is a real `<select>` bound to server-fetched, active
 * customers only — never a free-text field. The Server Action itself
 * still re-validates this against the real FK (see actions.ts comment);
 * this dropdown is a UX convenience, not the security boundary.
 */
export function StoreForm({ customers }: StoreFormProps) {
  const [state, formAction, pending] = useActionState(createStoreAction, initialStoreFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-customerId`} className="mb-1.5 block text-sm font-medium text-foreground">
          Müşteri
        </label>
        <select id={`${formId}-customerId`} name="customerId" required className={inputClasses}>
          <option value="">Seçin...</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Mağaza Adı
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
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Oluşturuluyor..." : "Mağaza Oluştur"}
      </Button>
    </form>
  );
}
