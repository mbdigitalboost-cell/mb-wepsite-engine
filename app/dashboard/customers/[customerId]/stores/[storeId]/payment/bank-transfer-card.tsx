import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACCOUNT_HOLDER_MAX_LENGTH, BANK_NAME_MAX_LENGTH, formatBankIban, toBankTransferDetails } from "@/lib/commerce/payments/bank-transfer";
import { saveBankTransferDetailsAction } from "./bank-transfer-actions";

const inputClasses = "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

const STATUS_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  kaydedildi: { text: "Havale/EFT bilgileri kaydedildi.", ok: true },
  kaldirildi: { text: "Havale/EFT bilgileri kaldırıldı. IBAN artık hiçbir yerde gösterilmiyor.", ok: true },
  sahip: { text: "Kaydedilemedi: hesap sahibi adı zorunlu.", ok: false },
  banka: { text: "Kaydedilemedi: banka adı zorunlu.", ok: false },
  "iban-bicim": { text: "Kaydedilemedi: IBAN, TR ile başlayan 26 karakter olmalı (TR + 24 rakam).", ok: false },
  "iban-kontrol": { text: "Kaydedilemedi: IBAN geçersiz, kontrol hanesi tutmuyor. Numarayı kontrol edin.", ok: false },
  hata: { text: "Kaydedilemedi. Alanları kontrol edip tekrar deneyin.", ok: false },
};

/**
 * Faz 40 (ek) — Mağaza → Ödeme → "Havale/EFT bilgileri". Bu bilgi yalnız
 * Havale/EFT ile verilen siparişin müşterisine, sipariş sonrası gösterilir
 * (sipariş sonrası ekran, Siparişlerim detayı, sipariş onayı e-postası).
 * Girilmemişse IBAN bölümü hiçbir yerde görünmez; varsayılan değer yoktur.
 */
export async function BankTransferCard({ customerId, storeId, status }: { customerId: string; storeId: string; status?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("store_bank_transfer_details").select("account_holder, bank_name, iban").eq("store_id", storeId).maybeSingle();
  const details = toBankTransferDetails(data);
  const message = status ? STATUS_MESSAGES[status] : undefined;

  return (
    <section className="mt-6 rounded-lg border border-black/10 p-5" id="havale">
      <h2 className="text-sm font-semibold tracking-tight">Havale/EFT bilgileri</h2>
      <p className="mt-1 max-w-2xl text-xs text-foreground/50">
        Müşteri &quot;Havale-EFT&quot; ile sipariş verdiğinde bu bilgiler yalnız o müşteriye, sipariş sonrası ekranda, &quot;Siparişlerim&quot;
        sayfasında ve sipariş onayı e-postasında gösterilir. Boş bırakırsanız IBAN hiçbir yerde gösterilmez. Kaldırmak için üç alanı da
        boşaltıp kaydedin.
      </p>
      {!details ? <p className="mt-3 text-sm text-amber-700">Havale/EFT bilgisi girilmemiş; Havale siparişlerinde IBAN gösterilmiyor.</p> : null}
      {message ? <p className={`mt-3 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p> : null}

      <form action={saveBankTransferDetailsAction.bind(null, customerId, storeId)} className="mt-4 grid max-w-2xl gap-4">
        <label className="text-sm">
          Hesap sahibi adı
          <input name="accountHolder" maxLength={ACCOUNT_HOLDER_MAX_LENGTH} defaultValue={details?.accountHolder ?? ""} autoComplete="off" className={inputClasses} />
        </label>
        <label className="text-sm">
          Banka adı
          <input name="bankName" maxLength={BANK_NAME_MAX_LENGTH} defaultValue={details?.bankName ?? ""} autoComplete="off" className={inputClasses} />
        </label>
        <label className="text-sm">
          IBAN
          <input name="iban" maxLength={40} defaultValue={details ? formatBankIban(details.iban) : ""} autoComplete="off" spellCheck={false} className={`${inputClasses} font-mono`} />
          <span className="mt-1 block text-xs text-foreground/50">TR ile başlayan 26 karakter. Boşluklu ya da boşluksuz yazabilirsiniz; kontrol hanesi doğrulanır.</span>
        </label>
        <div>
          <button type="submit" className="h-9 rounded-md bg-brand-accent px-4 text-sm font-medium text-white hover:opacity-90">
            Havale/EFT bilgilerini kaydet
          </button>
        </div>
      </form>
    </section>
  );
}
