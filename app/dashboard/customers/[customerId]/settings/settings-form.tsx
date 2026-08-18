"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { saveSiteSettingsAction } from "./actions";
import { initialSiteSettingsFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

type Values = {
  companyName: string;
  alternateName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  serviceArea: string;
  workingHours: string;
  logo: string;
  logoWhite: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  radius: string;
  buttonStyle: string;
};

const FIELDS: { name: keyof Values; label: string; placeholder?: string }[] = [
  { name: "companyName", label: "Şirket Adı" },
  { name: "alternateName", label: "Alternatif İsim" },
  { name: "phone", label: "Telefon", placeholder: "0535 791 11 96" },
  { name: "whatsapp", label: "WhatsApp", placeholder: "0535 791 11 96" },
  { name: "email", label: "E-posta" },
  { name: "address", label: "Adres" },
  { name: "serviceArea", label: "Hizmet Alanı", placeholder: "Onikişubat, Kahramanmaraş" },
  { name: "workingHours", label: "Çalışma Saatleri" },
  { name: "logo", label: "Logo URL" },
  { name: "logoWhite", label: "Logo (Beyaz) URL" },
  { name: "favicon", label: "Favicon URL" },
  { name: "primaryColor", label: "Ana Renk" },
  { name: "secondaryColor", label: "İkincil Renk" },
  { name: "radius", label: "Köşe Yuvarlaklığı" },
  { name: "buttonStyle", label: "Buton Stili" },
];

export function SettingsForm({
  customerId,
  settingsId,
  initialValues,
}: {
  customerId: string;
  settingsId: string | null;
  initialValues: Values;
}) {
  const action = saveSiteSettingsAction.bind(null, customerId, settingsId);
  const [state, formAction, pending] = useActionState(action, initialSiteSettingsFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={`${formId}-${field.name}`} className="mb-1.5 block text-sm font-medium text-foreground">
            {field.label}
          </label>
          <input
            id={`${formId}-${field.name}`}
            name={field.name}
            type="text"
            placeholder={field.placeholder}
            defaultValue={initialValues[field.name]}
            className={inputClasses}
          />
        </div>
      ))}

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
