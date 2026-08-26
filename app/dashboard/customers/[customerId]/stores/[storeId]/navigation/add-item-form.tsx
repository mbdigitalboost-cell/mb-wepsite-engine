"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { createNavigationItemAction } from "./actions";
import { initialStoreNavigationFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface AddItemFormProps {
  customerId: string;
  storeId: string;
  menuId: string;
}

export function AddItemForm({ customerId, storeId, menuId }: AddItemFormProps) {
  const action = createNavigationItemAction.bind(null, customerId, storeId, menuId);
  const [state, formAction, pending] = useActionState(action, initialStoreNavigationFormState);
  const formId = useId();

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <label htmlFor={`${formId}-label`} className="mb-1.5 block text-xs text-foreground/60">Etiket</label>
        <input id={`${formId}-label`} name="label" type="text" required placeholder="Ana Sayfa" className={inputClasses} />
      </div>
      <div className="flex-1">
        <label htmlFor={`${formId}-url`} className="mb-1.5 block text-xs text-foreground/60">URL</label>
        <input id={`${formId}-url`} name="url" type="text" required placeholder="/" className={inputClasses} />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Ekleniyor..." : "+ Öğe Ekle"}
      </Button>
      {state.error ? <p role="alert" className="w-full text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
