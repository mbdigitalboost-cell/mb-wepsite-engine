"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { initialOptionValueFormState, type OptionValueFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface OptionValueFormValues {
  value: string;
  sortOrder: number;
}

const EMPTY_VALUES: OptionValueFormValues = { value: "", sortOrder: 0 };

interface OptionValueFormProps {
  /** Rendered once per option group's own section, so this is fixed/hidden — never a dropdown the user picks (see actions.ts's createOptionValueAction, which validates it server-side regardless). */
  optionGroupId: string;
  initialValues?: OptionValueFormValues;
  action: (prevState: OptionValueFormState, formData: FormData) => Promise<OptionValueFormState>;
  submitLabel: string;
}

/** FAZ 2C-2 — Option Value (ör. "Siyah", "L") create/update, shared form. */
export function OptionValueForm({ optionGroupId, initialValues = EMPTY_VALUES, action, submitLabel }: OptionValueFormProps) {
  const [state, formAction, pending] = useActionState(action, initialOptionValueFormState);
  const formId = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="optionGroupId" value={optionGroupId} />
      <div className="min-w-[140px] flex-1">
        <label htmlFor={`${formId}-value`} className="sr-only">
          Değer
        </label>
        <input
          id={`${formId}-value`}
          name="value"
          type="text"
          required
          defaultValue={initialValues.value}
          placeholder="Siyah"
          className={inputClasses}
        />
      </div>
      <div className="w-20">
        <label htmlFor={`${formId}-sortOrder`} className="sr-only">
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
        <p role="alert" className="w-full text-xs text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : submitLabel}
      </Button>
    </form>
  );
}
