"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { initialBrandModelFormState, type BrandModelFormState } from "./form-state";
import type { BrandModelRow } from "@/lib/commerce/brand-models";

/**
 * Site Tasarımı v3 + Silahını Seç Sistemi devir metni, Kısım C — bir
 * markanın merkezi model kataloğu: ekle (metin + Ekle), sil (×), sırala
 * (basit yukarı/aşağı ok — devir metninin kendi "sürükle-bırak yerine
 * basit ok" tercihi). `deleteAction`/`moveUpAction`/`moveDownAction`
 * çağıran (brands/page.tsx) tarafından customerId/storeId/brandId'ye
 * KADAR bind edilmiş geliyor — burada sadece modelId ile ikinci bir
 * bind daha yapılıyor.
 */
export function BrandModelsPanel({
  models,
  addAction,
  deleteAction,
  moveUpAction,
  moveDownAction,
}: {
  models: BrandModelRow[];
  addAction: (prevState: BrandModelFormState, formData: FormData) => Promise<BrandModelFormState>;
  deleteAction: (modelId: string) => Promise<void>;
  moveUpAction: (modelId: string) => Promise<void>;
  moveDownAction: (modelId: string) => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(addAction, initialBrandModelFormState);
  const formId = useId();

  return (
    <div>
      <p className="text-xs font-medium text-foreground/70">Modeller</p>

      {models.length === 0 ? (
        <p className="mt-1 text-xs text-foreground/50">Henüz model eklenmemiş.</p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {models.map((model, index) => (
            <li
              key={model.id}
              className="flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-foreground"
            >
              <form action={moveUpAction.bind(null, model.id)}>
                <button
                  type="submit"
                  disabled={index === 0}
                  aria-label={`${model.name} modelini yukarı taşı`}
                  className="text-foreground/40 hover:text-foreground disabled:opacity-30"
                >
                  ↑
                </button>
              </form>
              <form action={moveDownAction.bind(null, model.id)}>
                <button
                  type="submit"
                  disabled={index === models.length - 1}
                  aria-label={`${model.name} modelini aşağı taşı`}
                  className="text-foreground/40 hover:text-foreground disabled:opacity-30"
                >
                  ↓
                </button>
              </form>
              {model.name}
              <form action={deleteAction.bind(null, model.id)}>
                <button
                  type="submit"
                  aria-label={`${model.name} modelini sil`}
                  className="text-foreground/40 hover:text-red-600"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-2 flex gap-2">
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          placeholder="ör. TP9 — yazıp Ekle'ye tıklayın"
          className={`${inputClasses} h-8 text-xs`}
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Ekleniyor..." : "Ekle"}
        </Button>
      </form>
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
