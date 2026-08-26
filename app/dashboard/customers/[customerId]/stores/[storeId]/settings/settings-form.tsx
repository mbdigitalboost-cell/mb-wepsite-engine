"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { updateStoreSettingsAction } from "./actions";
import { initialStoreSettingsFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";
import { STORE_TAX_MODES } from "@/lib/validation/store-settings";

interface StoreSettingsFormProps {
  customerId: string;
  storeId: string;
  initialValues: { currency: string; locale: string; taxMode: string };
}

const TAX_MODE_LABELS: Record<string, string> = {
  included: "Fiyata Dahil",
  excluded: "Fiyata Dahil Değil",
  disabled: "KDV Uygulanmıyor",
};

export function StoreSettingsForm({ customerId, storeId, initialValues }: StoreSettingsFormProps) {
  const action = updateStoreSettingsAction.bind(null, customerId, storeId);
  const [state, formAction, pending] = useActionState(action, initialStoreSettingsFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-currency`} className="mb-1.5 block text-sm font-medium text-foreground">
            Para Birimi
          </label>
          <input id={`${formId}-currency`} name="currency" type="text" required defaultValue={initialValues.currency} maxLength={3} className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-locale`} className="mb-1.5 block text-sm font-medium text-foreground">
            Dil/Bölge
          </label>
          <input id={`${formId}-locale`} name="locale" type="text" required defaultValue={initialValues.locale} className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-taxMode`} className="mb-1.5 block text-sm font-medium text-foreground">
          KDV Modu
        </label>
        <select id={`${formId}-taxMode`} name="taxMode" required defaultValue={initialValues.taxMode} className={inputClasses}>
          {STORE_TAX_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {TAX_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
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
