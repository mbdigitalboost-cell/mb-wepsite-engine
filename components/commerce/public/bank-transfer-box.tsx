import { formatBankIban, type BankTransferDetails } from "@/lib/commerce/payments/bank-transfer";
import { formatPrice } from "@/lib/utils/format-price";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";

/**
 * Faz 40 (ek) — Havale/EFT siparişinde mağazanın hesap bilgileri (sipariş
 * sonrası ekran ve Siparişlerim detayı). Değer sunucuda, siparişin kendi
 * mağazası için okunur; kayıt yoksa bu bileşen hiç çağrılmaz. Yalnız mağazanın
 * girdiği bilgiler ve siparişin tutarı gösterilir (ek talimat uydurulmaz).
 */
export function BankTransferBox({ details, amount, orderNumber }: { details: BankTransferDetails; amount: number | null; orderNumber: number }) {
  return (
    <div className="mt-3 rounded-[14px] border border-[#292929] bg-[#0A0A0A] p-3">
      <p className={`${storefrontDisplayClasses} text-xs font-semibold text-[#F5F5F5]`}>Havale / EFT bilgileri</p>
      <dl className="mt-2 space-y-1.5 text-sm text-[#A3A3A3]">
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Hesap sahibi</dt>
          <dd className="text-[#F5F5F5]">{details.accountHolder}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Banka</dt>
          <dd className="text-[#F5F5F5]">{details.bankName}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>IBAN</dt>
          <dd className={`${storefrontMonoClasses} break-all text-[#F5F5F5]`}>{formatBankIban(details.iban)}</dd>
        </div>
        {amount !== null ? (
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt>Ödenecek tutar</dt>
            <dd className={`${storefrontMonoClasses} text-[#F5F5F5]`}>{formatPrice(amount)}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Sipariş no</dt>
          <dd className={`${storefrontMonoClasses} text-[#F5F5F5]`}>#{orderNumber}</dd>
        </div>
      </dl>
    </div>
  );
}
