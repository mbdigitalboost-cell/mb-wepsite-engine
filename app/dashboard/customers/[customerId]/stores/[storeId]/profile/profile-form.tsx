"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { updateStoreProfileAction } from "./actions";
import { initialStoreProfileFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface StoreProfileFormProps {
  customerId: string;
  storeId: string;
  initialValues: {
    displayName: string;
    description: string;
    logoUrl: string;
    faviconUrl: string;
    phone: string;
    email: string;
    address: string;
    socialLinks: {
      instagram: string;
      facebook: string;
      whatsapp: string;
      tiktok: string;
      youtube: string;
      linkedin: string;
    };
    businessInfo: {
      tradeName: string;
      taxOffice: string;
      taxNumber: string;
      mersisNumber: string;
    };
  };
}

export function StoreProfileForm({ customerId, storeId, initialValues }: StoreProfileFormProps) {
  const action = updateStoreProfileAction.bind(null, customerId, storeId);
  const [state, formAction, pending] = useActionState(action, initialStoreProfileFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor={`${formId}-displayName`} className="mb-1.5 block text-sm font-medium text-foreground">
          Görünen Ad
        </label>
        <input id={`${formId}-displayName`} name="displayName" type="text" defaultValue={initialValues.displayName} className={inputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-description`} className="mb-1.5 block text-sm font-medium text-foreground">
          Açıklama
        </label>
        <textarea id={`${formId}-description`} name="description" rows={3} defaultValue={initialValues.description} className={inputClasses} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-logoUrl`} className="mb-1.5 block text-sm font-medium text-foreground">
            Logo URL
          </label>
          <input id={`${formId}-logoUrl`} name="logoUrl" type="text" defaultValue={initialValues.logoUrl} className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-faviconUrl`} className="mb-1.5 block text-sm font-medium text-foreground">
            Favicon URL
          </label>
          <input id={`${formId}-faviconUrl`} name="faviconUrl" type="text" defaultValue={initialValues.faviconUrl} className={inputClasses} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-phone`} className="mb-1.5 block text-sm font-medium text-foreground">
            Telefon
          </label>
          <input id={`${formId}-phone`} name="phone" type="text" placeholder="0535 791 11 96" defaultValue={initialValues.phone} className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-foreground">
            E-posta
          </label>
          <input id={`${formId}-email`} name="email" type="email" defaultValue={initialValues.email} className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-address`} className="mb-1.5 block text-sm font-medium text-foreground">
          Adres
        </label>
        <textarea id={`${formId}-address`} name="address" rows={2} defaultValue={initialValues.address} className={inputClasses} />
      </div>

      <fieldset className="rounded-lg border border-black/10 p-4">
        <legend className="px-1 text-sm font-medium text-foreground">Sosyal Medya</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-instagram`} className="mb-1.5 block text-xs text-foreground/60">Instagram</label>
            <input id={`${formId}-instagram`} name="socialLinks.instagram" type="text" defaultValue={initialValues.socialLinks.instagram} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-facebook`} className="mb-1.5 block text-xs text-foreground/60">Facebook</label>
            <input id={`${formId}-facebook`} name="socialLinks.facebook" type="text" defaultValue={initialValues.socialLinks.facebook} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-whatsapp`} className="mb-1.5 block text-xs text-foreground/60">WhatsApp</label>
            <input id={`${formId}-whatsapp`} name="socialLinks.whatsapp" type="text" placeholder="0535 791 11 96" defaultValue={initialValues.socialLinks.whatsapp} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-tiktok`} className="mb-1.5 block text-xs text-foreground/60">TikTok</label>
            <input id={`${formId}-tiktok`} name="socialLinks.tiktok" type="text" defaultValue={initialValues.socialLinks.tiktok} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-youtube`} className="mb-1.5 block text-xs text-foreground/60">YouTube</label>
            <input id={`${formId}-youtube`} name="socialLinks.youtube" type="text" defaultValue={initialValues.socialLinks.youtube} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-linkedin`} className="mb-1.5 block text-xs text-foreground/60">LinkedIn</label>
            <input id={`${formId}-linkedin`} name="socialLinks.linkedin" type="text" defaultValue={initialValues.socialLinks.linkedin} className={inputClasses} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-black/10 p-4">
        <legend className="px-1 text-sm font-medium text-foreground">İşletme Bilgisi</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-tradeName`} className="mb-1.5 block text-xs text-foreground/60">Ticari Unvan</label>
            <input id={`${formId}-tradeName`} name="businessInfo.tradeName" type="text" defaultValue={initialValues.businessInfo.tradeName} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-taxOffice`} className="mb-1.5 block text-xs text-foreground/60">Vergi Dairesi</label>
            <input id={`${formId}-taxOffice`} name="businessInfo.taxOffice" type="text" defaultValue={initialValues.businessInfo.taxOffice} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-taxNumber`} className="mb-1.5 block text-xs text-foreground/60">Vergi No</label>
            <input id={`${formId}-taxNumber`} name="businessInfo.taxNumber" type="text" defaultValue={initialValues.businessInfo.taxNumber} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-mersisNumber`} className="mb-1.5 block text-xs text-foreground/60">MERSİS No</label>
            <input id={`${formId}-mersisNumber`} name="businessInfo.mersisNumber" type="text" defaultValue={initialValues.businessInfo.mersisNumber} className={inputClasses} />
          </div>
        </div>
      </fieldset>

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
