"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { LegalMarkdown } from "@/components/commerce/public/legal/legal-markdown";
import { LEGAL_ACCEPTANCE_LABEL, MARKETING_CONSENT_TEXT } from "@/lib/legal/acceptance";
import { storefrontRadioClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { renderCheckoutContractsAction } from "./actions";

type ContractsInput = Parameters<typeof renderCheckoutContractsAction>[1];
type Which = "pre" | "sales";

/**
 * Faz 33 — ödeme adımındaki onaylar.
 *  - ZORUNLU kutu (name="legalAccepted", HTML required) — sunucu da
 *    kontrol eder (createOrderAction → legalAcceptanceError).
 *  - İki bağlantı, o anki sepet/alıcı/adres/kargo/ödeme bilgileriyle
 *    SUNUCUDA doldurulmuş metni pencere içinde açar
 *    (renderCheckoutContractsAction — özetle aynı tutarlar).
 *  - AYRI, OPSİYONEL, varsayılan işaretsiz ticari ileti onayı
 *    (name="marketingConsent") — siparişin şartı değildir.
 *  - KVKK aydınlatma metnine bağlantı (onay kutusu değil).
 */
export function CheckoutLegalConsent({
  storeSlug,
  kvkkHref,
  getContractsInput,
  disabled,
}: {
  storeSlug: string;
  kvkkHref: string | null;
  getContractsInput: () => ContractsInput;
  disabled: boolean;
}) {
  const [open, setOpen] = useState<Which | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<{ pre: { title: string; text: string }; sales: { title: string; text: string } } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  async function openContract(which: Which) {
    setOpen(which);
    setLoading(true);
    setError(null);
    try {
      // Her açılışta yeniden doldur: sepet/ödeme yöntemi/kod bu arada değişmiş olabilir.
      const result = await renderCheckoutContractsAction(storeSlug, getContractsInput());
      if (result.ok) setContracts({ pre: result.preInformation, sales: result.distanceSales });
      else setError(result.error);
    } catch {
      setError("Metin şu an yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = open && contracts ? (open === "pre" ? contracts.pre : contracts.sales) : null;
  const linkButton = "text-[#D95F00] underline underline-offset-2 hover:text-[#F26A00]";

  return (
    <div className="space-y-3 rounded-[14px] border border-[#292929] p-4 text-sm">
      <label className="flex items-start gap-2.5 text-[#F5F5F5]">
        <input type="checkbox" name="legalAccepted" required disabled={disabled} className={`mt-0.5 shrink-0 ${storefrontRadioClasses}`} />
        <span>
          <button type="button" onClick={() => void openContract("pre")} className={linkButton}>
            Ön Bilgilendirme Formu
          </button>
          &apos;nu ve{" "}
          <button type="button" onClick={() => void openContract("sales")} className={linkButton}>
            Mesafeli Satış Sözleşmesi
          </button>
          &apos;ni okudum, onaylıyorum.
          <span className="sr-only"> ({LEGAL_ACCEPTANCE_LABEL})</span>
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-xs text-[#A3A3A3]">
        <input type="checkbox" name="marketingConsent" disabled={disabled} className={`mt-0.5 shrink-0 ${storefrontRadioClasses}`} />
        <span>{MARKETING_CONSENT_TEXT}</span>
      </label>

      {kvkkHref ? (
        <p className="text-xs text-[#737373]">
          Kişisel verileriniz siparişinizin alınması ve teslimi için{" "}
          <Link href={kvkkHref} target="_blank" className="underline underline-offset-2 hover:text-[#F5F5F5]">
            KVKK Aydınlatma Metni
          </Link>{" "}
          kapsamında işlenir.
        </p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-contract-title"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[14px] border border-[#292929] bg-[#111111]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#292929] px-5 py-3">
              <h2 id="checkout-contract-title" className={`${storefrontDisplayClasses} text-base font-bold text-[#F5F5F5]`}>
                {current?.title ?? (open === "pre" ? "Ön Bilgilendirme Formu" : "Mesafeli Satış Sözleşmesi")}
              </h2>
              <button ref={closeRef} type="button" onClick={() => setOpen(null)} aria-label="Kapat" className="text-[#A3A3A3] hover:text-[#F5F5F5]">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4" aria-live="polite" aria-busy={loading}>
              {loading ? <p className="text-sm text-[#A3A3A3]">Metin hazırlanıyor…</p> : null}
              {!loading && error ? <p className="text-sm text-red-400">{error}</p> : null}
              {!loading && current ? <LegalMarkdown source={current.text} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
