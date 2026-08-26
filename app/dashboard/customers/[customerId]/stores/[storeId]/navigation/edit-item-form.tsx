"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateNavigationItemAction } from "./actions";
import { initialStoreNavigationFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface EditItemFormProps {
  customerId: string;
  storeId: string;
  item: { id: string; label: string; url: string; isActive: boolean; parentItemId: string | null };
}

/** Collapsed by default — click "Düzenle" to reveal label/url fields. Keeps the row list compact. */
export function EditItemForm({ customerId, storeId, item }: EditItemFormProps) {
  const [open, setOpen] = useState(false);
  const action = updateNavigationItemAction.bind(null, customerId, storeId, item.id);
  const [state, formAction, pending] = useActionState(action, initialStoreNavigationFormState);
  const formId = useId();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
        Düzenle
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 w-full space-y-2 rounded-md border border-black/10 p-3">
      <input type="hidden" name="isActive" value={item.isActive ? "true" : ""} />
      {item.parentItemId ? <input type="hidden" name="parentItemId" value={item.parentItemId} /> : null}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <label htmlFor={`${formId}-label`} className="mb-1 block text-xs text-foreground/60">Etiket</label>
          <input id={`${formId}-label`} name="label" type="text" required defaultValue={item.label} className={inputClasses} />
        </div>
        <div className="flex-1">
          <label htmlFor={`${formId}-url`} className="mb-1 block text-xs text-foreground/60">URL</label>
          <input id={`${formId}-url`} name="url" type="text" required defaultValue={item.url} className={inputClasses} />
        </div>
      </div>
      {state.error ? <p role="alert" className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Kaydediliyor..." : "Kaydet"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
      </div>
    </form>
  );
}
