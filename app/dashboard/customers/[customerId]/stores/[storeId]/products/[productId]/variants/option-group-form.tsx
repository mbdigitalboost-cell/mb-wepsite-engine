"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { initialOptionGroupFormState, type OptionGroupFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface OptionGroupFormValues {
  name: string;
  sortOrder: number;
}

const EMPTY_VALUES: OptionGroupFormValues = { name: "", sortOrder: 0 };

interface OptionGroupFormProps {
  initialValues?: OptionGroupFormValues;
  action: (prevState: OptionGroupFormState, formData: FormData) => Promise<OptionGroupFormState>;
  submitLabel: string;
}

/** FAZ 2C-2 — Option Group (ör. "Renk", "Beden") create/update, shared form — same "one generic form, bound Server Action decides create vs update" shape as product-form.tsx/category-form.tsx. */
export function OptionGroupForm({ initialValues = EMPTY_VALUES, action, submitLabel }: OptionGroupFormProps) {
  const [state, formAction, pending] = useActionState(action, initialOptionGroupFormState);
  const formId = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[160px]">
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Grup Adı
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          required
          defaultValue={initialValues.name}
          placeholder="Renk"
          className={inputClasses}
        />
      </div>
      <div className="w-24">
        <label htmlFor={`${formId}-sortOrder`} className="mb-1.5 block text-sm font-medium text-foreground">
          Sıra
        </label>
        <input
          id={`${formId}-sortOrder`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={initialValues.sortOrder}
          className={inputClasses}
        />
      </div>

      {state.error ? (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Kaydediliyor..." : submitLabel}
      </Button>
    </form>
  );
}
