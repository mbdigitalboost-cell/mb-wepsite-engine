"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { createMediaAssetAction } from "./actions";
import { initialMediaFormState } from "./form-state";

const inputClasses =
  "w-full rounded-md border border-black/15 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus-visible:border-foreground/40 focus-visible:outline-none";

export function MediaForm({ customerId }: { customerId: string }) {
  const action = createMediaAssetAction.bind(null, customerId);
  const [state, formAction, pending] = useActionState(action, initialMediaFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor={`${formId}-fileName`} className="mb-1.5 block text-sm font-medium text-foreground">
          Dosya Adı
        </label>
        <input id={`${formId}-fileName`} name="fileName" type="text" required placeholder="petra-logo.svg" className={inputClasses} />
      </div>
      <div>
        <label htmlFor={`${formId}-fileUrl`} className="mb-1.5 block text-sm font-medium text-foreground">
          Dosya URL
        </label>
        <input id={`${formId}-fileUrl`} name="fileUrl" type="text" required placeholder="https://..." className={inputClasses} />
        <p className="mt-1 text-xs text-foreground/50">
          Gerçek dosya yükleme bu fazın kapsamında değil — burada mevcut/erişilebilir bir URL kaydedilir.
        </p>
      </div>
      <div>
        <label htmlFor={`${formId}-storagePath`} className="mb-1.5 block text-sm font-medium text-foreground">
          Klasör Yolu
        </label>
        <input
          id={`${formId}-storagePath`}
          name="storagePath"
          type="text"
          required
          placeholder="brand/petra-logo.svg"
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">brand/, hero/, solutions/, services/, projects/, campaigns/ veya banners/ ile başlamalı.</p>
      </div>
      <div>
        <label htmlFor={`${formId}-altText`} className="mb-1.5 block text-sm font-medium text-foreground">
          Alt Metin
        </label>
        <input id={`${formId}-altText`} name="altText" type="text" className={inputClasses} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor={`${formId}-type`} className="mb-1.5 block text-sm font-medium text-foreground">
            Tür
          </label>
          <input id={`${formId}-type`} name="type" type="text" placeholder="image/svg+xml" className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-width`} className="mb-1.5 block text-sm font-medium text-foreground">
            Genişlik
          </label>
          <input id={`${formId}-width`} name="width" type="number" min={0} className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-height`} className="mb-1.5 block text-sm font-medium text-foreground">
            Yükseklik
          </label>
          <input id={`${formId}-height`} name="height" type="number" min={0} className={inputClasses} />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Ekle"}
      </Button>
    </form>
  );
}
