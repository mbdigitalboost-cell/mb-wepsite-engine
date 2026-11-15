"use client";

import { useActionState, useState } from "react";
import { initialReturnRequestFormState, type ReturnRequestFormState } from "./form-state";

export interface ReturnFormLine {
  id: string;
  label: string;
  remaining: number;
  personalized: boolean;
}

const REASONS: Array<{ value: string; label: string }> = [
  { value: "changed_mind", label: "Cayma / fikrim değişti" },
  { value: "damaged", label: "Hasarlı geldi" },
  { value: "wrong_item", label: "Yanlış ürün gönderildi" },
  { value: "not_fit", label: "Model / beden uymadı" },
  { value: "other", label: "Diğer" },
];

const inputClasses =
  "mt-1 w-full rounded-md border border-[#292929] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#525252] focus:border-[#D95F00] focus:outline-none";

/**
 * Faz 30 — iptal ya da iade talep formu. İptal: tüm sipariş (kalem seçimi
 * yok). İade: kalem + adet; kişiye özel kalemler seçilemez. IBAN yalnız
 * para IBAN'a iade edilecekse istenir (kartla ödemede sorulmaz). Sunucu
 * her şeyi yeniden doğrular.
 */
export function ReturnRequestForm({
  kind,
  lines,
  askIban,
  action,
}: {
  kind: "cancel" | "return";
  lines: ReturnFormLine[];
  askIban: boolean;
  action: (prev: ReturnRequestFormState, formData: FormData) => Promise<ReturnRequestFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialReturnRequestFormState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-lg border border-[#292929] px-4 text-sm font-semibold text-[#F5F5F5] hover:border-[#D95F00]"
      >
        {kind === "cancel" ? "Siparişi iptal et" : "İade talebi oluştur"}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-[#292929] bg-[#171717] p-4">
      <input type="hidden" name="kind" value={kind} />
      <p className="text-sm font-semibold text-[#F5F5F5]">{kind === "cancel" ? "Sipariş iptal talebi" : "İade talebi"}</p>
      {kind === "cancel" ? (
        <p className="text-xs text-[#A3A3A3]">Talebiniz mağazaya iletilir; onaylandığında siparişiniz iptal edilir ve ödeme yaptıysanız iade edilir.</p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-xs text-[#A3A3A3]">İade etmek istediğiniz ürünler ve adet</legend>
          {lines.map((line) => (
            <label key={line.id} className="flex items-center justify-between gap-3 rounded-md border border-[#292929] px-3 py-2 text-sm text-[#F5F5F5]">
              <span className="min-w-0">
                {line.label}
                {line.personalized ? <span className="mt-0.5 block text-xs text-[#A3A3A3]">Kişiye özel hazırlandığı için cayma kapsamı dışında.</span> : null}
              </span>
              <select
                name={`qty:${line.id}`}
                defaultValue="0"
                disabled={line.personalized || line.remaining < 1}
                className="h-9 rounded-md border border-[#292929] bg-[#0A0A0A] px-2 text-sm text-[#F5F5F5] disabled:opacity-40"
                aria-label={`${line.label} iade adedi`}
              >
                {Array.from({ length: line.remaining + 1 }, (_, quantity) => (
                  <option key={quantity} value={quantity}>
                    {quantity}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      )}

      <label className="block text-xs text-[#A3A3A3]">
        Neden
        <select name="reason" defaultValue={kind === "cancel" ? "changed_mind" : ""} required className={inputClasses}>
          {kind === "return" ? (
            <option value="" disabled>
              Seçin
            </option>
          ) : null}
          {REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-[#A3A3A3]">
        Açıklama (isteğe bağlı)
        <textarea name="note" rows={3} maxLength={1000} className={inputClasses} />
      </label>

      {askIban ? (
        <div className="space-y-3 rounded-md border border-[#292929] p-3">
          <p className="text-xs text-[#A3A3A3]">Ödemeniz kart dışında alındığı için iade banka hesabınıza yapılacak.</p>
          <label className="block text-xs text-[#A3A3A3]">
            Hesap sahibinin adı soyadı
            <input name="accountHolder" required minLength={3} maxLength={140} autoComplete="name" className={inputClasses} />
          </label>
          <label className="block text-xs text-[#A3A3A3]">
            IBAN
            <input name="iban" required placeholder="TR00 0000 0000 0000 0000 0000 00" maxLength={40} autoComplete="off" className={inputClasses} />
          </label>
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-lg bg-[#D95F00] px-4 text-sm font-semibold text-white hover:bg-[#B34C00] disabled:opacity-60"
        >
          {pending ? "Gönderiliyor…" : "Talebi gönder"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 items-center rounded-lg px-4 text-sm text-[#A3A3A3] hover:text-[#F5F5F5]">
          Vazgeç
        </button>
      </div>
    </form>
  );
}
