"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { createHomepageSectionAction } from "./actions";
import { initialHomepageSectionFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface AddSectionFormProps {
  customerId: string;
  storeId: string;
  sectionTypes: { key: string; label: string }[];
}

/** The "+ Bölüm Ekle" picker — reads from `homepage_section_types` (server-fetched), never a hardcoded list here. */
export function AddSectionForm({ customerId, storeId, sectionTypes }: AddSectionFormProps) {
  const action = createHomepageSectionAction.bind(null, customerId, storeId);
  const [state, formAction, pending] = useActionState(action, initialHomepageSectionFormState);
  const [sectionTypeKey, setSectionTypeKey] = useState(sectionTypes[0]?.key ?? "");
  const formId = useId();

  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-lg border border-dashed border-black/20 p-4">
      <div>
        <label htmlFor={`${formId}-sectionTypeKey`} className="mb-1.5 block text-sm font-medium text-foreground">
          Bölüm Tipi
        </label>
        <select
          id={`${formId}-sectionTypeKey`}
          name="sectionTypeKey"
          required
          value={sectionTypeKey}
          onChange={(event) => setSectionTypeKey(event.target.value)}
          className={inputClasses}
        >
          {sectionTypes.map((type) => (
            <option key={type.key} value={type.key}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-title`} className="mb-1.5 block text-xs text-foreground/60">Başlık</label>
          <input id={`${formId}-title`} name="title" type="text" className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-imageUrl`} className="mb-1.5 block text-xs text-foreground/60">Görsel URL</label>
          <input id={`${formId}-imageUrl`} name="imageUrl" type="text" className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-description`} className="mb-1.5 block text-xs text-foreground/60">Açıklama</label>
        <textarea id={`${formId}-description`} name="description" rows={2} className={inputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-linkUrl`} className="mb-1.5 block text-xs text-foreground/60">Link</label>
        <input id={`${formId}-linkUrl`} name="linkUrl" type="text" className={inputClasses} />
      </div>

      {sectionTypeKey === "hero" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-secondaryCtaLabel`} className="mb-1.5 block text-xs text-foreground/60">İkincil CTA Etiketi</label>
            <input id={`${formId}-secondaryCtaLabel`} name="config.secondaryCtaLabel" type="text" className={inputClasses} />
          </div>
          <div>
            <label htmlFor={`${formId}-secondaryCtaHref`} className="mb-1.5 block text-xs text-foreground/60">İkincil CTA Link</label>
            <input id={`${formId}-secondaryCtaHref`} name="config.secondaryCtaHref" type="text" className={inputClasses} />
          </div>
        </div>
      ) : null}

      {state.error ? <p role="alert" className="text-sm text-red-600">{state.error}</p> : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Ekleniyor..." : "+ Bölüm Ekle"}
      </Button>
    </form>
  );
}
