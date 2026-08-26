"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { setStoreMaintenanceModeAction } from "./actions";
import { initialStoreSettingsFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface MaintenanceFormProps {
  customerId: string;
  storeId: string;
  initialValues: { maintenanceMode: boolean; maintenanceMessage: string };
}

/**
 * CRITICAL action — requires the current user's password (re-entered
 * here, never pre-filled/remembered) on every submit, matching the
 * existing changeUserRoleAction pattern in app/dashboard/users/actions.ts.
 */
export function MaintenanceForm({ customerId, storeId, initialValues }: MaintenanceFormProps) {
  const action = setStoreMaintenanceModeAction.bind(null, customerId, storeId);
  const [state, formAction, pending] = useActionState(action, initialStoreSettingsFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <input
          id={`${formId}-maintenanceMode`}
          name="maintenanceMode"
          type="checkbox"
          value="true"
          defaultChecked={initialValues.maintenanceMode}
          className="h-4 w-4"
        />
        <label htmlFor={`${formId}-maintenanceMode`} className="text-sm font-medium text-foreground">
          Bakım modu aktif
        </label>
      </div>

      <div>
        <label htmlFor={`${formId}-maintenanceMessage`} className="mb-1.5 block text-sm font-medium text-foreground">
          Bakım Mesajı <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <textarea
          id={`${formId}-maintenanceMessage`}
          name="maintenanceMessage"
          rows={2}
          defaultValue={initialValues.maintenanceMessage}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-foreground">
          Şifreniz (onay için)
        </label>
        <input id={`${formId}-password`} name="password" type="password" required className={inputClasses} />
        <p className="mt-1 text-xs text-foreground/50">
          Bakım modu kritik bir işlem — devam etmek için şifrenizi yeniden girin.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} variant="outline">
        {pending ? "Uygulanıyor..." : "Bakım Modunu Güncelle"}
      </Button>
    </form>
  );
}
