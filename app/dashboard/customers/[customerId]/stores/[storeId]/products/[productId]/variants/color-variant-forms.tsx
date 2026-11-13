"use client";

import { useActionState } from "react";
import { initialColorVariantFormState, type ColorVariantFormState } from "./color-variant-form-state";

type BoundAction = (prevState: ColorVariantFormState, formData: FormData) => Promise<ColorVariantFormState>;

const cellInput =
  "w-full rounded-md border border-[#E4E4E7] bg-white px-2.5 py-1.5 text-sm text-[#17171A] focus-visible:border-[#D95F00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D95F00]/20";

function Messages({ state }: { state: ColorVariantFormState }) {
  return (
    <>
      {state.error ? (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-xs text-green-700">{state.success}</p> : null}
    </>
  );
}

/**
 * Faz 25 — "Eksik varyantları oluştur". Her eksik kombinasyon için stok
 * alanı ZORUNLU ve boş başlar: ürünün tek stoğunu renklere bölmek yanlış
 * olur, adet admin'den gelmeli. Action page.tsx (server) tarafında bind edildi.
 */
export function CreateMissingVariantsForm({
  action,
  combos,
}: {
  action: BoundAction;
  combos: Array<{ key: string; label: string; swatch: string | null; sku: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, initialColorVariantFormState);
  return (
    <form action={formAction} className="mt-3 space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        {combos.map((combo) => (
          <li key={combo.key} className="flex items-center gap-3 rounded-lg border border-[#E4E4E7] bg-white p-3">
            {combo.swatch ? (
              <span className="h-4 w-4 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: combo.swatch }} aria-hidden="true" />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[#17171A]">{combo.label}</span>
              <span className="block font-mono text-[11px] text-[#71717A]">{combo.sku}</span>
            </span>
            <label className="flex items-center gap-1.5 text-xs text-[#71717A]">
              Stok
              <input
                name={`stock_${combo.key}`}
                type="number"
                min={0}
                step={1}
                required
                placeholder="adet"
                className="w-20 rounded-md border border-[#E4E4E7] px-2 py-1.5 text-sm text-[#17171A] focus-visible:border-[#D95F00] focus-visible:outline-none"
              />
            </label>
          </li>
        ))}
      </ul>
      <Messages state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-[#D95F00] px-4 text-sm font-semibold text-white hover:bg-[#B34C00] disabled:opacity-60"
      >
        {pending ? "Oluşturuluyor…" : "Eksik varyantları oluştur"}
      </button>
    </form>
  );
}

/** Varyant tablosu satırı: SKU / fiyat / eski fiyat / stok — boş fiyat = ürün fiyatını devral. */
export function VariantInlineForm({
  action,
  initial,
  productPriceLabel,
}: {
  action: BoundAction;
  initial: { sku: string; price: string; compareAtPrice: string; stock: string };
  productPriceLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialColorVariantFormState);
  return (
    <form action={formAction} className="grid grid-cols-2 gap-2 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] sm:items-end">
      <label className="text-[11px] text-[#71717A]">
        Varyant SKU
        <input name="sku" defaultValue={initial.sku} required className={`${cellInput} mt-1 font-mono`} />
      </label>
      <label className="text-[11px] text-[#71717A]">
        Fiyat
        <input name="price" inputMode="decimal" defaultValue={initial.price} placeholder={productPriceLabel} className={`${cellInput} mt-1`} />
      </label>
      <label className="text-[11px] text-[#71717A]">
        Eski fiyat
        <input name="compareAtPrice" inputMode="decimal" defaultValue={initial.compareAtPrice} className={`${cellInput} mt-1`} />
      </label>
      <label className="text-[11px] text-[#71717A]">
        Stok
        <input name="stock" type="number" min={0} step={1} required defaultValue={initial.stock} className={`${cellInput} mt-1`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-[34px] rounded-md border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#17171A] hover:border-[#D95F00] disabled:opacity-60"
      >
        {pending ? "…" : "Kaydet"}
      </button>
      <div className="col-span-2 sm:col-span-5">
        <Messages state={state} />
      </div>
    </form>
  );
}
