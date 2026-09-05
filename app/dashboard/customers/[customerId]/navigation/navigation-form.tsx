"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { initialNavigationItemFormState, type NavigationItemFormState } from "./form-state";

interface NavigationFormProps {
  initialLabel?: string;
  initialHref?: string;
  initialSortOrder?: number;
  action: (prevState: NavigationItemFormState, formData: FormData) => Promise<NavigationItemFormState>;
  submitLabel: string;
}

export function NavigationForm({
  initialLabel = "",
  initialHref = "",
  initialSortOrder = 0,
  action,
  submitLabel,
}: NavigationFormProps) {
  const [state, formAction, pending] = useActionState(action, initialNavigationItemFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor={`${formId}-label`} className="mb-1.5 block text-sm font-medium text-foreground">
          Etiket
        </label>
        <input id={`${formId}-label`} name="label" type="text" defaultValue={initialLabel} className={inputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-href`} className="mb-1.5 block text-sm font-medium text-foreground">
          URL
        </label>
        <input
          id={`${formId}-href`}
          name="href"
          type="text"
          defaultValue={initialHref}
          placeholder="/hizmetler"
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">
          İç sayfa yolu (/hizmetler), sabit bağlantı (#iletisim) veya http(s):// ile başlayan tam adres.
        </p>
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
          defaultValue={initialSortOrder}
          className={inputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : submitLabel}
      </Button>
    </form>
  );
}
