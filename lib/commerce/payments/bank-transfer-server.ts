import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { shouldShowBankTransfer, toBankTransferDetails, type BankTransferDetails } from "@/lib/commerce/payments/bank-transfer";

/**
 * Faz 40 (ek) — mağazanın Havale/EFT bilgilerini SUNUCUDA okur.
 *
 * `store_bank_transfer_details` tablosunu vitrin (anon) ve müşteri okuyamaz;
 * buradaki fonksiyonlar service-role ile çalışır ve değeri yalnız şu
 * durumlarda döndürür: çağıran, mağazası sunucuda doğrulanmış bir Havale
 * siparişini vermiştir. Değer her zaman `storeId` ile süzülür — bir mağazanın
 * siparişine başka mağazanın IBAN'ı gitmez. Hata hâlinde "yok" döner (bölüm
 * gösterilmez); IBAN hiçbir zaman loglanmaz.
 */

async function readStoreDetails(storeId: string): Promise<BankTransferDetails | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("store_bank_transfer_details").select("store_id, account_holder, bank_name, iban").eq("store_id", storeId).maybeSingle();
    if (error || !data || data.store_id !== storeId) return null;
    return toBankTransferDetails(data);
  } catch {
    return null;
  }
}

/** Bu sipariş için müşteriye gösterilecek Havale bilgisi; koşul tutmuyorsa ya da kayıt yoksa null. */
export async function getOrderBankTransferDetails(
  storeId: string,
  order: { paymentMethod: string | null; paymentStatus: string; status: string },
): Promise<BankTransferDetails | null> {
  if (!shouldShowBankTransfer(order)) return null;
  return readStoreDetails(storeId);
}

/** Ödeme formu için: mağaza Havale bilgisi girmiş mi? (Yalnız var/yok; değer vitrine gitmez.) */
export async function storeHasBankTransferDetails(storeId: string): Promise<boolean> {
  return (await readStoreDetails(storeId)) !== null;
}
