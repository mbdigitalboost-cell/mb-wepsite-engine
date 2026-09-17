"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  initialVariantOptionAssignmentFormState,
  type VariantOptionAssignmentFormState,
} from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";

interface OptionGroupWithValues {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}

interface VariantOptionAssignmentFormProps {
  optionGroups: OptionGroupWithValues[];
  /** This variant's currently-assigned value id per group (empty string = none selected yet). */
  selectedValueIdByGroupId: Record<string, string>;
  action: (prevState: VariantOptionAssignmentFormState, formData: FormData) => Promise<VariantOptionAssignmentFormState>;
}

/**
 * FAZ 2C-2 — variant ↔ option value assignment. Her seçenek grubu için
 * AYRI bir `<select>`, hepsi AYNI `name="optionValueIds"` ile — bu
 * sayede FormData.getAll("optionValueIds") her gruptan EN FAZLA bir
 * değer toplar (native `<select>` zaten tek-seçimli), "aynı gruptan iki
 * değer" senaryosu HTML seviyesinde zaten mümkün değil. Sunucu tarafı
 * (setVariantOptionValuesAction, variants/actions.ts) yine de AYNI
 * kontrolü application-layer'da authoritative olarak yapar — bu form
 * sadece daha iyi bir UX sağlar, güvenlik sınırı değildir.
 *
 * Boş "— Seçilmedi —" seçimi (value="") sunucuya HİÇ gönderilmez — bu
 * yüzden gerçek submit, useActionState'e verilen action'ı SARAN yerel
 * bir wrapper üzerinden gidiyor: ham FormData'dan boş optionValueIds
 * girişlerini eler, TEMİZ bir FormData ile asıl (bound) server action'ı
 * çağırır. variantOptionValueAssignmentSchema boş string'i geçersiz bir
 * UUID olarak reddederdi — bu normalizasyon olmadan "bu grup için hiçbir
 * şey seçmedim" durumu bir Zod hatasına dönüşürdü.
 */
export function VariantOptionAssignmentForm({
  optionGroups,
  selectedValueIdByGroupId,
  action,
}: VariantOptionAssignmentFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prevState: VariantOptionAssignmentFormState, formData: FormData) => {
      const filtered = new FormData();
      for (const [key, value] of formData.entries()) {
        if (key === "optionValueIds" && value === "") continue;
        filtered.append(key, value);
      }
      return action(prevState, filtered);
    },
    initialVariantOptionAssignmentFormState,
  );
  const formId = useId();

  if (optionGroups.length === 0) return null;

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-xs font-medium text-foreground/70">Seçenek Değerleri</p>
      <div className="flex flex-wrap gap-3">
        {optionGroups.map((group) => (
          <div key={group.id} className="min-w-[160px]">
            <label htmlFor={`${formId}-${group.id}`} className="mb-1 block text-xs text-foreground/60">
              {group.name}
            </label>
            <select
              id={`${formId}-${group.id}`}
              name="optionValueIds"
              defaultValue={selectedValueIdByGroupId[group.id] ?? ""}
              className={inputClasses}
            >
              <option value="">— Seçilmedi —</option>
              {group.values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.value}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Seçenekleri Kaydet"}
      </Button>
    </form>
  );
}
