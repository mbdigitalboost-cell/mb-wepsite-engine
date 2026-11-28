"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess, requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { isValidEmail, parseEmailList, validateStoreEmailSettings, type StoreEmailSettings } from "@/lib/commerce/order-emails/settings";
import { resendLoggedEmail, sendStoreTestEmail } from "@/lib/commerce/order-emails/service";

function settingsPath(customerId: string, storeId: string): string {
  return `/dashboard/customers/${customerId}/stores/${storeId}/settings`;
}

/**
 * Faz 40 — mağazanın e-posta ayarı (gönderen adı/adresi, yanıt adresi,
 * bildirim adresleri, tür anahtarları). Yalnız store_admin+; storeId'nin bu
 * müşteriye ait olduğunu requireStoreAdminAccess doğrular, RLS ayrıca korur.
 * Gönderen adresinin alan adı e-posta sağlayıcısında doğrulanmış olmalıdır;
 * burada yalnız biçim denetlenir (doğrulanmamış adresle gönderim sağlayıcıda
 * reddedilir ve gönderim listesinde "Gönderilemedi" olarak görünür).
 */
export async function updateEmailSettingsAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = settingsPath(customerId, storeId);
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const settings: StoreEmailSettings = {
    fromName: field("fromName"),
    fromEmail: field("fromEmail"),
    replyToEmail: field("replyToEmail") || null,
    orderNotificationEmails: parseEmailList(String(formData.get("orderNotificationEmails") ?? "")),
    sendOrderConfirmation: formData.get("sendOrderConfirmation") === "on",
    sendShipped: formData.get("sendShipped") === "on",
    sendCancelRefund: formData.get("sendCancelRefund") === "on",
    sendStoreNewOrder: formData.get("sendStoreNewOrder") === "on",
  };
  if (validateStoreEmailSettings(settings) !== null) redirect(`${base}?eposta=hata#eposta`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_email_settings").upsert(
    {
      store_id: storeId,
      from_name: settings.fromName,
      from_email: settings.fromEmail,
      reply_to_email: settings.replyToEmail,
      order_notification_emails: settings.orderNotificationEmails,
      send_order_confirmation: settings.sendOrderConfirmation,
      send_shipped: settings.sendShipped,
      send_cancel_refund: settings.sendCancelRefund,
      send_store_new_order: settings.sendStoreNewOrder,
    },
    { onConflict: "store_id" },
  );
  if (error) {
    console.error("[email-settings] save failed:", error.message);
    redirect(`${base}?eposta=hata#eposta`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.email_settings_update",
    entityType: "store",
    entityId: storeId,
    // Adresler denetim kaydına yazılmaz; yalnız neyin değiştiği.
    metadata: {
      hasReplyTo: settings.replyToEmail !== null,
      notificationCount: settings.orderNotificationEmails.length,
      sendOrderConfirmation: settings.sendOrderConfirmation,
      sendShipped: settings.sendShipped,
      sendCancelRefund: settings.sendCancelRefund,
      sendStoreNewOrder: settings.sendStoreNewOrder,
    },
  });

  revalidatePath(base);
  redirect(`${base}?eposta=kaydedildi#eposta`);
}

/** "Bana test e-postası gönder" — mağazanın KAYITLI ayarıyla, oturumdaki kullanıcının adresine. */
export async function sendTestEmailAction(customerId: string, storeId: string): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = settingsPath(customerId, storeId);
  const recipient = (user.email ?? "").trim();
  if (!recipient || !isValidEmail(recipient)) redirect(`${base}?eposta=test-alici#eposta`);

  const outcome = await sendStoreTestEmail(storeId, recipient);
  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.email_test_send",
    entityType: "store",
    entityId: storeId,
    metadata: { status: outcome.status },
  });

  revalidatePath(base);
  const code = outcome.status === "sent" ? "test-gonderildi" : outcome.status === "skipped" ? "test-ayar-yok" : "test-hata";
  redirect(`${base}?eposta=${code}#eposta`);
}

/**
 * "Tekrar gönder" — gönderilememiş ya da atlanmış bir sipariş e-postasını
 * yeniden dener (store_editor+; sipariş durumu değiştirmekle aynı yetki).
 * Gönderilmiş bir e-posta yeniden gönderilmez.
 */
export async function resendOrderEmailAction(customerId: string, storeId: string, logId: string, returnPath: string): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId, customerId);
  const outcome = await resendLoggedEmail(storeId, logId);
  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order.email_resend",
    entityType: "order_email_log",
    entityId: logId,
    metadata: { storeId, status: outcome.status },
  });

  // Dönüş adresi yalnız bu mağazanın panel yolu olabilir (açık yönlendirme yok).
  const storeRoot = `/dashboard/customers/${customerId}/stores/${storeId}/`;
  const safePath = returnPath.startsWith(storeRoot) && !returnPath.includes("//") ? returnPath.split("?")[0].split("#")[0] : settingsPath(customerId, storeId);
  revalidatePath(safePath);
  const code = outcome.status === "sent" ? "gonderildi" : outcome.status === "not_allowed" ? "uygun-degil" : outcome.status === "duplicate" ? "zaten" : "hata";
  redirect(`${safePath}?epostaTekrar=${code}#eposta`);
}
