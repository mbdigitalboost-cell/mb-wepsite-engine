"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import type { ContentFieldConfig } from "@/lib/cms/dashboard/content-types";
import { initialContentFormState, type ContentFormState } from "./form-state";

const inputClasses =
  "w-full rounded-md border border-black/15 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus-visible:border-foreground/40 focus-visible:outline-none";

interface ContentFormProps {
  fields: ContentFieldConfig[];
  initialValues?: Record<string, string>;
  initialSortOrder?: number;
  action: (prevState: ContentFormState, formData: FormData) => Promise<ContentFormState>;
  submitLabel: string;
}

/**
 * One generic form, driven entirely by the field config for whichever
 * content type is being edited (see lib/cms/dashboard/content-types.ts)
 * — this is what lets 6 different content types share one route/form
 * instead of 6 hand-written near-duplicates.
 */
export function ContentForm({ fields, initialValues = {}, initialSortOrder = 0, action, submitLabel }: ContentFormProps) {
  const [state, formAction, pending] = useActionState(action, initialContentFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label htmlFor={`${formId}-${field.key}`} className="mb-1.5 block text-sm font-medium text-foreground">
            {field.label}
            {field.required ? null : <span className="text-foreground/40"> (opsiyonel)</span>}
          </label>
          {field.kind === "textarea" ? (
            <textarea
              id={`${formId}-${field.key}`}
              name={field.key}
              rows={4}
              defaultValue={initialValues[field.key] ?? ""}
              className={inputClasses}
            />
          ) : (
            <input
              id={`${formId}-${field.key}`}
              name={field.key}
              type="text"
              defaultValue={initialValues[field.key] ?? ""}
              placeholder={field.kind === "url" ? "https://..." : undefined}
              className={inputClasses}
            />
          )}
        </div>
      ))}

      <div>
        <label htmlFor={`${formId}-sortOrder`} className="mb-1.5 block text-sm font-medium text-foreground">
          Sıralama
        </label>
        <input
          id={`${formId}-sortOrder`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialSortOrder}
          className={inputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor..." : submitLabel}
      </Button>
    </form>
  );
}
