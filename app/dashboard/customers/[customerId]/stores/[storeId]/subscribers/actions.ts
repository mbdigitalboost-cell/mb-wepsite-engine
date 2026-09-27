"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess, requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { sendEmail } from "@/lib/notifications/send-email";
import { sendWhatsappMessage } from "@/lib/notifications/send-whatsapp";
import type { CustomerDiscountType, CustomerDiscountValueType } from "@/lib/supabase/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids a support call over a misread code

function generateDiscountCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function basePath(customerId: string, storeId: string): string {
  return `/dashboard/customers/${customerId}/stores/${storeId}/subscribers`;
}

/**
 * store_admin+ (requireStoreAdminAccess — requireAal2 dahil, bkz. migration
 * 0036'nın kendi başlık yorumu: bir indirim tanımlamak gerçek bir finansal
 * etki, store_editor'ın içerik-düzenleme yetkisinin ötesinde). Yazma RLS
 * üzerinden, service-role client İLE DEĞİL — customer_discounts_insert_admin_tier
 * policy'si (migration 0036) zaten aynı yetki kontrolünü DB seviyesinde de
 * tekrarlıyor (bu kodun kendisi bypass edilse bile).
 *
 * 'auto' + misafir hedef kombinasyonu burada da (DB CHECK'ine ek olarak)
 * ayrıca reddediliyor — kullanıcıya ham bir constraint-violation mesajı
 * yerine anlaşılır bir Türkçe hata dönmek için.
 */
export async function createDiscountAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const targetKind = String(formData.get("targetKind") ?? "");
  const storeCustomerId = String(formData.get("storeCustomerId") ?? "").trim() || null;
  const guestEmail = String(formData.get("guestEmail") ?? "").trim() || null;
  const guestPhone = String(formData.get("guestPhone") ?? "").trim() || null;
  const discountType = String(formData.get("discountType") ?? "") as CustomerDiscountType;
  const valueType = String(formData.get("valueType") ?? "") as CustomerDiscountValueType;
  const rawValue = Number(formData.get("value"));
  const rawExpiresAt = String(formData.get("expiresAt") ?? "").trim();
  const manualCode = String(formData.get("code") ?? "").trim();

  if (discountType !== "code" && discountType !== "auto") redirect(`${basePath(customerId, storeId)}?error=form`);
  if (valueType !== "percentage" && valueType !== "fixed") redirect(`${basePath(customerId, storeId)}?error=form`);
  if (!Number.isFinite(rawValue) || rawValue <= 0) redirect(`${basePath(customerId, storeId)}?error=form`);
  if (valueType === "percentage" && rawValue > 100) redirect(`${basePath(customerId, storeId)}?error=form`);

  if (targetKind === "registered" && !storeCustomerId) redirect(`${basePath(customerId, storeId)}?error=form`);
  if (targetKind === "guest" && !guestEmail && !guestPhone) redirect(`${basePath(customerId, storeId)}?error=form`);
  if (targetKind === "guest" && discountType === "auto") {
    // Migration 0036's own security decision — misafir bir 'auto' indirim
    // için oturum kimliği doğrulaması yok, sadece girilen e-posta eşleşmesi
    // sahte bir güvenlik olurdu.
    redirect(`${basePath(customerId, storeId)}?error=guest-auto`);
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("customer_discounts").insert({
    store_id: storeId,
    store_customer_id: targetKind === "registered" ? storeCustomerId : null,
    guest_email: targetKind === "guest" ? guestEmail : null,
    guest_phone: targetKind === "guest" ? guestPhone : null,
    discount_type: discountType,
    code: discountType === "code" ? (manualCode || generateDiscountCode()).toUpperCase() : null,
    value_type: valueType,
    value: rawValue,
    expires_at: rawExpiresAt ? new Date(rawExpiresAt).toISOString() : null,
    created_by: user.id,
  });

  if (error) {
    console.error("[subscribers] failed to create discount:", error.message);
    // unique_violation (code already taken) is the one realistic, actionable
    // case an admin can fix by re-submitting with a different code.
    redirect(`${basePath(customerId, storeId)}?error=${error.code === "23505" ? "code-taken" : "create-failed"}`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "customer_discount.create",
    entityType: "customer_discount",
    entityId: null,
    metadata: { storeId, targetKind, discountType, valueType, value: rawValue },
  });

  revalidatePath(basePath(customerId, storeId));
  redirect(`${basePath(customerId, storeId)}?success=discount-created`);
}

/** store_admin+ — aynı yetki tier'ı, indirimi kalıcı silmek yerine devre dışı bırakır (migration 0036'nın kendi "no delete" duruşu). */
export async function deactivateDiscountAction(customerId: string, storeId: string, discountId: string): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customer_discounts")
    .update({ is_active: false })
    .eq("id", discountId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[subscribers] failed to deactivate discount:", error.message);
    redirect(`${basePath(customerId, storeId)}?error=deactivate-failed`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "customer_discount.deactivate",
    entityType: "customer_discount",
    entityId: discountId,
    metadata: { storeId },
  });

  revalidatePath(basePath(customerId, storeId));
  redirect(`${basePath(customerId, storeId)}?success=discount-deactivated`);
}

/**
 * store_editor+ — bir mesaj göndermek (indirim tanımlamaktan farklı olarak)
 * finansal bir etki değil, orders'ın kendi editor-tier okuma/yazma
 * ayrımıyla aynı seviyede tutuldu.
 */
export async function sendSubscriberEmailAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const to = String(formData.get("to") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const text = String(formData.get("message") ?? "").trim();

  if (!to || !subject || !text) redirect(`${basePath(customerId, storeId)}?error=form`);

  const result = await sendEmail({ to, subject, text });

  if (!result.sent) {
    redirect(`${basePath(customerId, storeId)}?error=email-not-sent`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "subscriber.email_sent",
    entityType: "store_customer",
    entityId: null,
    metadata: { storeId, to },
  });

  redirect(`${basePath(customerId, storeId)}?success=email-sent`);
}

/** store_editor+ — sendSubscriberEmailAction'la aynı yetki gerekçesi. */
export async function sendSubscriberWhatsappAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const to = String(formData.get("to") ?? "").trim();
  const text = String(formData.get("message") ?? "").trim();

  if (!to || !text) redirect(`${basePath(customerId, storeId)}?error=form`);

  const result = await sendWhatsappMessage({ to, text });

  if (!result.sent) {
    redirect(`${basePath(customerId, storeId)}?error=whatsapp-not-sent`);
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "subscriber.whatsapp_sent",
    entityType: "store_customer",
    entityId: null,
    metadata: { storeId, to },
  });

  redirect(`${basePath(customerId, storeId)}?success=whatsapp-sent`);
}
