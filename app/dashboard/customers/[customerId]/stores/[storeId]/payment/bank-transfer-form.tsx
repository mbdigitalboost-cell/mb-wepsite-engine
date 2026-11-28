"use client";

import { useActionState, useId } from "react";
import { inputClasses } from "@/lib/utils/input-classes";
import { ACCOUNT_HOLDER_MAX_LENGTH, BANK_NAME_MAX_LENGTH } from "@/lib/commerce/payments/bank-transfer";
import { initialBankTransferFormState, type BankTransferFormState, type BankTransferSaved } from "./bank-transfer-form-state";

type SaveAction = (prevState: BankTransferFormState, formData: FormData) => Promise<BankTransferFormState>;
type RemoveAction = () => Promise<BankTransferFormState>;

/**
 * Faz 40 (ek) — Havale/EFT bilgileri formu (istemci adacığı; Ödeme
 * sayfasındaki diğer formlarla aynı desen: action'lar sunucuda bind edilip
 * prop olarak gelir).
 *
 * - Gönderim sürerken düğme devre dışı ve "Kaydediliyor…".
 * - Başarı ya da hata mesajı düğmenin hemen yanında görünür.
 * - Kayıtlı bilgi maskeli gösterilir: IBAN'ın yalnız son 4 hanesi. Tam IBAN
 *   bu bileşene hiç gelmez; değiştirmek için yenisi yazılır, boş bırakılırsa
 *   kayıtlı IBAN korunur.
 * - `saved` sunucudan gelir ve her başarılı işlemden sonra yenilenir
 *   (revalidatePath); sayfa yenilendiğinde de aynı kayıt görünür.
 */
export function BankTransferForm({ saveAction, removeAction, saved }: { saveAction: SaveAction; removeAction: RemoveAction; saved: BankTransferSaved | null }) {
  const [saveState, saveFormAction, savePending] = useActionState(saveAction, initialBankTransferFormState);
  const [removeState, removeFormAction, removePending] = useActionState(removeAction, initialBankTransferFormState);
  const formId = useId();
  const busy = savePending || removePending;

  return (
    <div className="mt-4 max-w-2xl">
      {saved ? (
        <div className="rounded-md border border-green-600/30 bg-green-50 px-4 py-3 text-sm">
          <p className="font-medium text-green-900">Kayıtlı bilgi</p>
          <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-y-1 text-green-950">
            <dt className="text-green-900/70">Hesap sahibi</dt>
            <dd>{saved.accountHolder}</dd>
            <dt className="text-green-900/70">Banka</dt>
            <dd>{saved.bankName}</dd>
            <dt className="text-green-900/70">IBAN</dt>
            <dd className="font-mono">•••• {saved.ibanLast4}</dd>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-amber-700">Havale/EFT bilgisi girilmemiş; Havale siparişlerinde IBAN gösterilmiyor.</p>
      )}

      {/* key: kayıt değişince alanlar yeni değerlerle yeniden kurulur (IBAN alanı boşalır). */}
      <form key={saved ? `${saved.accountHolder}|${saved.bankName}|${saved.ibanLast4}` : "empty"} action={saveFormAction} className="mt-4 grid gap-4">
        <div>
          <label htmlFor={`${formId}-holder`} className="mb-1.5 block text-sm font-medium text-foreground">
            Hesap sahibi adı
          </label>
          <input id={`${formId}-holder`} name="accountHolder" maxLength={ACCOUNT_HOLDER_MAX_LENGTH} defaultValue={saved?.accountHolder ?? ""} autoComplete="off" className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-bank`} className="mb-1.5 block text-sm font-medium text-foreground">
            Banka adı
          </label>
          <input id={`${formId}-bank`} name="bankName" maxLength={BANK_NAME_MAX_LENGTH} defaultValue={saved?.bankName ?? ""} autoComplete="off" className={inputClasses} />
        </div>
        <div>
          <label htmlFor={`${formId}-iban`} className="mb-1.5 block text-sm font-medium text-foreground">
            {saved ? "Yeni IBAN (yalnız değiştirmek için)" : "IBAN"}
          </label>
          <input
            id={`${formId}-iban`}
            name="iban"
            maxLength={40}
            defaultValue=""
            placeholder={saved ? `Kayıtlı: •••• ${saved.ibanLast4}` : "TR00 0000 0000 0000 0000 0000 00"}
            autoComplete="off"
            spellCheck={false}
            className={`${inputClasses} font-mono`}
          />
          <p className="mt-1 text-xs text-foreground/50">
            TR ile başlayan 26 karakter. Boşluklu ya da boşluksuz yazabilirsiniz; kontrol hanesi doğrulanır.
            {saved ? " Boş bırakırsanız kayıtlı IBAN korunur." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            aria-busy={savePending}
            className="h-9 rounded-md bg-brand-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savePending ? "Kaydediliyor…" : "Havale/EFT bilgilerini kaydet"}
          </button>
          <div aria-live="polite">
            {!savePending && saveState.error ? (
              <p role="alert" className="text-sm text-red-600">
                {saveState.error}
              </p>
            ) : null}
            {!savePending && saveState.success ? <p className="text-sm font-medium text-green-700">✓ {saveState.success}</p> : null}
          </div>
        </div>
      </form>

      {saved ? (
        <form action={removeFormAction} className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
          <button
            type="submit"
            disabled={busy}
            aria-busy={removePending}
            className="h-9 rounded-md border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={(event) => {
              if (!window.confirm("Havale/EFT bilgileri kaldırılacak. Havale siparişlerinde IBAN artık gösterilmeyecek. Devam edilsin mi?")) event.preventDefault();
            }}
          >
            {removePending ? "Kaldırılıyor…" : "Bilgileri kaldır"}
          </button>
          {!removePending && removeState.error ? (
            <p role="alert" className="text-sm text-red-600">
              {removeState.error}
            </p>
          ) : null}
        </form>
      ) : !removePending && removeState.success ? (
        <p className="mt-3 text-sm font-medium text-green-700">✓ {removeState.success}</p>
      ) : null}
    </div>
  );
}
