"use client";

import { useActionState, useState } from "react";
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
  initial: { sku: string; price: string; compareAtPrice: string; stock: string; isActive: boolean };
  productPriceLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialColorVariantFormState);
  return (
    <form action={formAction} className="grid grid-cols-2 gap-2 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto_auto] sm:items-end">
      <input type="hidden" name="isActiveField" value="1" />
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
      <label className="flex h-[34px] items-center gap-1.5 text-xs text-[#17171A]">
        <input type="checkbox" name="isActive" defaultChecked={initial.isActive} className="h-4 w-4 rounded border-[#D4D4D8] accent-[#D95F00]" />
        Aktif
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-[34px] rounded-md border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#17171A] hover:border-[#D95F00] disabled:opacity-60"
      >
        {pending ? "…" : "Kaydet"}
      </button>
      <div className="col-span-2 sm:col-span-6">
        <Messages state={state} />
      </div>
    </form>
  );
}

/**
 * Faz 26 — tek adımda seçenek kurulumu. Seçeneği olmayan üründe yalnızca
 * "Seçenek adı + Değerler"; seçeneği olan üründe "Seçenek ekle" modu:
 * mevcut bir gruba değer ekle ya da yeni grup aç (yeni grup varyantı olan
 * üründe kombinasyonları çoğaltır → açık onay kutusu).
 */
export function OptionSetupForm({
  action,
  existingGroups,
  hasVariants,
}: {
  action: BoundAction;
  existingGroups: Array<{ id: string; name: string }>;
  hasVariants: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialColorVariantFormState);
  const [groupId, setGroupId] = useState(existingGroups[0]?.id ?? "");
  const isNewGroup = groupId === "";
  return (
    <form action={formAction} className="space-y-3">
      {existingGroups.length > 0 ? (
        <label className="block text-xs font-medium text-[#3F3F46]">
          Seçenek
          <select
            name="groupId"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className={`${cellInput} mt-1 max-w-xs`}
          >
            {existingGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — değer ekle
              </option>
            ))}
            <option value="">+ Yeni seçenek grubu</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="groupId" value="" />
      )}
      {isNewGroup ? (
        <label className="block text-xs font-medium text-[#3F3F46]">
          Seçenek adı
          <input name="groupName" placeholder="Renk" required className={`${cellInput} mt-1 max-w-xs`} />
        </label>
      ) : null}
      <label className="block text-xs font-medium text-[#3F3F46]">
        Değerler <span className="font-normal text-[#71717A]">(virgülle ayırın)</span>
        <input name="values" placeholder="Siyah, Coyote (Çöl)" required className={`${cellInput} mt-1`} />
      </label>
      {isNewGroup && hasVariants ? (
        <label className="flex items-start gap-2 rounded-md border border-[#D95F00]/40 bg-[#D95F00]/[0.06] p-2.5 text-xs text-[#8A3C00]">
          <input type="checkbox" name="confirmExpand" className="mt-0.5 h-4 w-4 accent-[#D95F00]" />
          <span>
            Kombinasyonları genişlet — bu ürünün mevcut varyantları silinmez ama yeni grup için değer taşımadıkları için mağazada seçilemez
            hâle gelir; yerlerine her kombinasyon için yeni varyant oluşur.
          </span>
        </label>
      ) : null}
      <Messages state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-[#D95F00] px-4 text-sm font-semibold text-white hover:bg-[#B34C00] disabled:opacity-60"
      >
        {pending ? "Oluşturuluyor…" : existingGroups.length > 0 ? "Seçenek ekle" : "Seçenekleri oluştur"}
      </button>
    </form>
  );
}
