import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ibanLast4, toBankTransferDetails } from "@/lib/commerce/payments/bank-transfer";
import { removeBankTransferDetailsAction, saveBankTransferDetailsAction } from "./bank-transfer-actions";
import { BankTransferForm } from "./bank-transfer-form";

/**
 * Faz 40 (ek) — Mağaza → Ödeme → "Havale/EFT bilgileri". Bu bilgi yalnız
 * Havale/EFT ile verilen siparişin müşterisine, sipariş sonrası gösterilir
 * (sipariş sonrası ekran, Siparişlerim detayı, sipariş onayı e-postası).
 * Girilmemişse IBAN bölümü hiçbir yerde görünmez; varsayılan değer yoktur.
 *
 * Kayıt her sayfa açılışında veritabanından okunur ve MASKELİ gösterilir:
 * forma yalnız hesap sahibi, banka ve IBAN'ın son 4 hanesi verilir; tam
 * IBAN tarayıcıya gönderilmez.
 */
export async function BankTransferCard({ customerId, storeId }: { customerId: string; storeId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("store_bank_transfer_details").select("account_holder, bank_name, iban").eq("store_id", storeId).maybeSingle();
  const details = toBankTransferDetails(data);

  return (
    <section className="mt-6 rounded-lg border border-black/10 p-5" id="havale">
      <h2 className="text-sm font-semibold tracking-tight">Havale/EFT bilgileri</h2>
      <p className="mt-1 max-w-2xl text-xs text-foreground/50">
        Müşteri &quot;Havale-EFT&quot; ile sipariş verdiğinde bu bilgiler yalnız o müşteriye, sipariş sonrası ekranda, &quot;Siparişlerim&quot;
        sayfasında ve sipariş onayı e-postasında gösterilir. Bilgi girilmemişse IBAN hiçbir yerde gösterilmez.
      </p>
      <BankTransferForm
        saveAction={saveBankTransferDetailsAction.bind(null, customerId, storeId)}
        removeAction={removeBankTransferDetailsAction.bind(null, customerId, storeId)}
        saved={details ? { accountHolder: details.accountHolder, bankName: details.bankName, ibanLast4: ibanLast4(details.iban) } : null}
      />
    </section>
  );
}
