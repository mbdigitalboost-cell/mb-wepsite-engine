"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { updateStoreBrandingAction } from "./actions";
import { initialStoreBrandingFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";
import { STORE_BUTTON_STYLES, STORE_COLOR_MODES } from "@/lib/validation/store-branding";

interface StoreBrandingFormProps {
  customerId: string;
  storeId: string;
  initialValues: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    buttonStyle: string;
    typography: string;
    colorMode: string;
    themeConfig: { hoverColor: string };
  };
}

const BUTTON_STYLE_LABELS: Record<string, string> = { rounded: "Yuvarlak Köşe", square: "Keskin Köşe", pill: "Hap (Tam Yuvarlak)" };
const COLOR_MODE_LABELS: Record<string, string> = { light: "Açık", dark: "Koyu", system: "Sistem" };

export function StoreBrandingForm({ customerId, storeId, initialValues }: StoreBrandingFormProps) {
  const action = updateStoreBrandingAction.bind(null, customerId, storeId);
  const [state, formAction, pending] = useActionState(action, initialStoreBrandingFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${formId}-primaryColor`} className="mb-1.5 block text-sm font-medium text-foreground">Ana Renk</label>
          <input id={`${formId}-primaryColor`} name="primaryColor" type="text" placeholder="#1a2b3c" defaultValue={initialValues.primaryColor} className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-secondaryColor`} className="mb-1.5 block text-sm font-medium text-foreground">İkincil Renk</label>
          <input id={`${formId}-secondaryColor`} name="secondaryColor" type="text" placeholder="#1a2b3c" defaultValue={initialValues.secondaryColor} className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-accentColor`} className="mb-1.5 block text-sm font-medium text-foreground">Vurgu Rengi</label>
          <input id={`${formId}-accentColor`} name="accentColor" type="text" placeholder="#1a2b3c" defaultValue={initialValues.accentColor} className={inputClasses} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-buttonStyle`} className="mb-1.5 block text-sm font-medium text-foreground">Buton Stili</label>
          <select id={`${formId}-buttonStyle`} name="buttonStyle" defaultValue={initialValues.buttonStyle} className={inputClasses}>
            <option value="">Seçilmedi</option>
            {STORE_BUTTON_STYLES.map((style) => (
              <option key={style} value={style}>{BUTTON_STYLE_LABELS[style]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-colorMode`} className="mb-1.5 block text-sm font-medium text-foreground">Tema Modu</label>
          <select id={`${formId}-colorMode`} name="colorMode" required defaultValue={initialValues.colorMode} className={inputClasses}>
            {STORE_COLOR_MODES.map((mode) => (
              <option key={mode} value={mode}>{COLOR_MODE_LABELS[mode]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-typography`} className="mb-1.5 block text-sm font-medium text-foreground">Tipografi</label>
        <input id={`${formId}-typography`} name="typography" type="text" placeholder="Inter" defaultValue={initialValues.typography} className={inputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-hoverColor`} className="mb-1.5 block text-sm font-medium text-foreground">Hover Rengi <span className="text-foreground/40">(opsiyonel)</span></label>
        <input id={`${formId}-hoverColor`} name="themeConfig.hoverColor" type="text" placeholder="#1a2b3c" defaultValue={initialValues.themeConfig.hoverColor} className={inputClasses} />
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
