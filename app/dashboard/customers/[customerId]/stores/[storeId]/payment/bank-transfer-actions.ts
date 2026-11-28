"use server";

import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { ibanLast4, resolveBankTransferSubmission, toBankTransferDetails } from "@/lib/commerce/payments/bank-transfer";
import type { BankTransferFormState } from "./bank-transfer-form-state";

/**
 * Faz 40 (ek) — mağazanın Havale/EFT bilgileri. Yalnız store_admin+
 * (ödeme anahtarlarıyla aynı yetki); storeId'nin bu müşteriye ait olduğunu
 * requireStoreAdminAccess doğrular, RLS ayrıca korur.
 *
 * Sonuç yönlendirmeyle değil FORM DURUMUYLA döner (useActionState): kart
 * "Kaydediliyor…" → "Kaydedildi" / hata mesajını yerinde gösterir. Önceki
 * sürüm sayfanın en altındaki karta yönlendiriyordu; kullanıcı sonucu
 * görmeyip düğmeye art arda bastı (aynı kayıt için 12 denetim satırı).
 *
 * IBAN ve hesap sahibi adı LOG'A YA DA DENETİM KAYDINA YAZILMAZ; denetimde
 * yalnız IBAN'ın son 4 hanesi tutulur. Tam IBAN istemciye geri gönderilmez.
 * Değer değişmediyse veritabanına ve denetim kaydına yeniden yazılmaz.
 */
export async function saveBankTransferDetailsAction(customerId: string, storeId: string, _prev: BankTransferFormState, formData: FormData): Promise<BankTransferFormState> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const supabase = await createSupabaseServerClient();

  const { data: existingRow, error: readError } = await supabase.from("store_bank_transfer_details").select("account_holder, bank_name, iban").eq("store_id", storeId).maybeSingle();
  if (readError) {
    console.error("[bank-transfer] read failed:", readError.message);
    return { error: "Kaydedilemedi: mevcut kayıt okunamadı. Tekrar deneyin.", success: null };
  }
  const existing = toBankTransferDetails(existingRow);

  const resolved = resolveBankTransferSubmission(
    {
      accountHolder: String(formData.get("accountHolder") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      iban: String(formData.get("iban") ?? ""),
    },
    existing?.iban ?? null,
  );
  if (resolved.kind === "error") return { error: `Kaydedilemedi: ${resolved.error}`, success: null };

  const { value } = resolved;
  const unchanged = existing !== null && existing.accountHolder === value.accountHolder && existing.bankName === value.bankName && existing.iban === value.iban;
  if (unchanged) return { error: null, success: "Bilgiler zaten kayıtlı; değişiklik yok." };

  const { error } = await supabase
    .from("store_bank_transfer_details")
    .upsert({ store_id: storeId, account_holder: value.accountHolder, bank_name: value.bankName, iban: value.iban }, { onConflict: "store_id" });
  if (error) {
    console.error("[bank-transfer] save failed:", error.message);
    return { error: "Kaydedilemedi. Tekrar deneyin.", success: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.bank_transfer_details_update",
    entityType: "store",
    entityId: storeId,
    metadata: { ibanLast4: ibanLast4(value.iban) },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/payment`);
  return { error: null, success: "Kaydedildi." };
}

/** Kaydı kaldırır: o andan itibaren IBAN hiçbir yerde gösterilmez. */
export async function removeBankTransferDetailsAction(customerId: string, storeId: string): Promise<BankTransferFormState> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const supabase = await createSupabaseServerClient();

  const { data: removed, error } = await supabase.from("store_bank_transfer_details").delete().eq("store_id", storeId).select("store_id");
  if (error) {
    console.error("[bank-transfer] delete failed:", error.message);
    return { error: "Kaldırılamadı. Tekrar deneyin.", success: null };
  }
  if ((removed ?? []).length > 0) {
    await logAuditEvent({ userId: user.id, customerId, action: "store.bank_transfer_details_remove", entityType: "store", entityId: storeId, metadata: {} });
  }

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/payment`);
  return { error: null, success: "Havale/EFT bilgileri kaldırıldı. IBAN artık hiçbir yerde gösterilmiyor." };
}
