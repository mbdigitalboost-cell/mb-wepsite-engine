"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { saveTrackingAction } from "./actions";
import { initialTrackingFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface TrackingFormProps {
  customerId: string;
  trackingId: string | null;
  initialValues: { ga4Id: string; gtmId: string; metaPixelId: string; metaCapiEnabled: boolean };
  /** Whether a token is already stored — the actual value NEVER reaches this Client Component. */
  hasToken: boolean;
}

export function TrackingForm({ customerId, trackingId, initialValues, hasToken }: TrackingFormProps) {
  const action = saveTrackingAction.bind(null, customerId, trackingId);
  const [state, formAction, pending] = useActionState(action, initialTrackingFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor={`${formId}-ga4Id`} className="mb-1.5 block text-sm font-medium text-foreground">
          GA4 ID
        </label>
        <input id={`${formId}-ga4Id`} name="ga4Id" type="text" defaultValue={initialValues.ga4Id} className={inputClasses} />
      </div>
      <div>
        <label htmlFor={`${formId}-gtmId`} className="mb-1.5 block text-sm font-medium text-foreground">
          GTM ID
        </label>
        <input id={`${formId}-gtmId`} name="gtmId" type="text" defaultValue={initialValues.gtmId} className={inputClasses} />
      </div>
      <div>
        <label htmlFor={`${formId}-metaPixelId`} className="mb-1.5 block text-sm font-medium text-foreground">
          Meta Pixel ID
        </label>
        <input
          id={`${formId}-metaPixelId`}
          name="metaPixelId"
          type="text"
          defaultValue={initialValues.metaPixelId}
          className={inputClasses}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="metaCapiEnabled" defaultChecked={initialValues.metaCapiEnabled} />
        Meta CAPI etkin
      </label>

      <div>
        <label htmlFor={`${formId}-metaCapiToken`} className="mb-1.5 block text-sm font-medium text-foreground">
          Meta CAPI Token
        </label>
        <input
          id={`${formId}-metaCapiToken`}
          name="metaCapiToken"
          type="password"
          autoComplete="off"
          placeholder={hasToken ? "•••••••••••• (değiştirmek için yeni değer girin)" : "Token girin"}
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">
          {hasToken
            ? "Bir token kayıtlı. Boş bırakırsanız mevcut token değişmez — hiçbir zaman ekranda gösterilmez."
            : "Henüz token kayıtlı değil."}
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </form>
  );
}
