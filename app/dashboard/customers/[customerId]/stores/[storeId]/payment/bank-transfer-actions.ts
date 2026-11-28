"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { ibanLast4, parseBankTransferInput } from "@/lib/commerce/payments/bank-transfer";

const ERROR_CODES: Record<string, string> = {
  "Hesap sahibi adı zorunlu.": "sahip",
  "Banka adı zorunlu.": "banka",
  "IBAN, TR ile başlayan 26 karakter olmalı (TR + 24 rakam).": "iban-bicim",
  "IBAN geçersiz: kontrol hanesi tutmuyor. Numarayı kontrol edin.": "iban-kontrol",
};

/**
 * Faz 40 (ek) — mağazanın Havale/EFT bilgileri. Yalnız store_admin+
 * (ödeme anahtarlarıyla aynı yetki); storeId'nin bu müşteriye ait olduğunu
 * requireStoreAdminAccess doğrular, RLS ayrıca korur.
 *
 * IBAN ve hesap sahibi adı LOG'A YA DA DENETİM KAYDINA YAZILMAZ; denetimde
 * yalnız IBAN'ın son 4 hanesi tutulur. Üç alan da boş gönderilirse kayıt
 * silinir: o andan itibaren IBAN hiçbir yerde gösterilmez.
 */
export async function saveBankTransferDetailsAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/payment`;

  const parsed = parseBankTransferInput({
    accountHolder: String(formData.get("accountHolder") ?? ""),
    bankName: String(formData.get("bankName") ?? ""),
    iban: String(formData.get("iban") ?? ""),
  });
  if (parsed.kind === "error") redirect(`${base}?havale=${ERROR_CODES[parsed.error] ?? "hata"}#havale`);

  const supabase = await createSupabaseServerClient();
  if (parsed.kind === "clear") {
    const { error } = await supabase.from("store_bank_transfer_details").delete().eq("store_id", storeId);
    if (error) {
      console.error("[bank-transfer] delete failed:", error.message);
      redirect(`${base}?havale=hata#havale`);
    }
  } else {
    const { error } = await supabase
      .from("store_bank_transfer_details")
      .upsert({ store_id: storeId, account_holder: parsed.value.accountHolder, bank_name: parsed.value.bankName, iban: parsed.value.iban }, { onConflict: "store_id" });
    if (error) {
      console.error("[bank-transfer] save failed:", error.message);
      redirect(`${base}?havale=hata#havale`);
    }
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: parsed.kind === "clear" ? "store.bank_transfer_details_remove" : "store.bank_transfer_details_update",
    entityType: "store",
    entityId: storeId,
    metadata: parsed.kind === "clear" ? {} : { ibanLast4: ibanLast4(parsed.value.iban) },
  });

  revalidatePath(base);
  redirect(`${base}?havale=${parsed.kind === "clear" ? "kaldirildi" : "kaydedildi"}#havale`);
}
