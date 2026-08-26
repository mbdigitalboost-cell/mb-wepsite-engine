"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateHomepageSectionAction } from "./actions";
import { initialHomepageSectionFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface EditSectionFormProps {
  customerId: string;
  storeId: string;
  section: {
    id: string;
    sectionTypeKey: string;
    internalLabel: string;
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    isActive: boolean;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
  };
}

export function EditSectionForm({ customerId, storeId, section }: EditSectionFormProps) {
  const [open, setOpen] = useState(false);
  const action = updateHomepageSectionAction.bind(null, customerId, storeId, section.id, section.sectionTypeKey);
  const [state, formAction, pending] = useActionState(action, initialHomepageSectionFormState);
  const formId = useId();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
        Düzenle
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 w-full space-y-3 rounded-md border border-black/10 p-3">
      <input type="hidden" name="isActive" value={section.isActive ? "true" : ""} />

      <div>
        <label htmlFor={`${formId}-internalLabel`} className="mb-1 block text-xs text-foreground/60">İç Etiket (yalnızca panelde görünür)</label>
        <input id={`${formId}-internalLabel`} name="internalLabel" type="text" defaultValue={section.internalLabel} className={inputClasses} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-title`} className="mb-1 block text-xs text-foreground/60">Başlık</label>
          <input id={`${formId}-title`} name="title" type="text" defaultValue={section.title} className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-imageUrl`} className="mb-1 block text-xs text-foreground/60">Görsel URL</label>
          <input id={`${formId}-imageUrl`} name="imageUrl" type="text" defaultValue={section.imageUrl} className={inputClasses} />
        </div>
      </div>
      <div>
        <label htmlFor={`${formId}-description`} className="mb-1 block text-xs text-foreground/60">Açıklama</label>
        <textarea id={`${formId}-description`} name="description" rows={2} defaultValue={section.description} className={inputClasses} />
      </div>
      <div>
        <label htmlFor={`${formId}-linkUrl`} className="mb-1 block text-xs text-foreground/60">Link</label>
        <input id={`${formId}-linkUrl`} name="linkUrl" type="text" defaultValue={section.linkUrl} className={inputClasses} />
      </div>

      {section.sectionTypeKey === "hero" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-secondaryCtaLabel`} className="mb-1 block text-xs text-foreground/60">İkincil CTA Etiketi</label>
            <input id={`${formId}-secondaryCtaLabel`} name="config.secondaryCtaLabel" type="text" defaultValue={section.secondaryCtaLabel} className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-secondaryCtaHref`} className="mb-1 block text-xs text-foreground/60">İkincil CTA Link</label>
            <input id={`${formId}-secondaryCtaHref`} name="config.secondaryCtaHref" type="text" defaultValue={section.secondaryCtaHref} className={inputClasses} />
          </div>
        </div>
      ) : null}

      {state.error ? <p role="alert" className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Kaydediliyor..." : "Kaydet"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
      </div>
    </form>
  );
}
