"use server";

import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { testIyzicoConnection } from "@/lib/integrations/iyzico";
import {
  getPaymentIntegrationCredentials,
  recordPaymentConnectionTest,
  savePaymentKeys,
  updatePaymentSettings,
} from "@/lib/integrations/store-payment-integration";
import type { PaymentIntegrationMode } from "@/lib/supabase/types";
import type { PaymentFormState } from "./form-state";

/**
 * Faz 22 — "Ödeme (iyzico)" admin sayfasının action'ları; Faz 21 Kargo
 * sayfasıyla AYNI desen. Hepsi store_admin+ (requireStoreAdminAccess →
 * requireAal2 dahil). Anahtarlar HİÇBİR dönüş değerinde, log'da ya da
 * audit metadata'sında yok — yalnızca son 4 hane.
 */

const KEY_MIN_LENGTH = 10;
const KEY_MAX_LENGTH = 500;

function paymentPath(customerId: string, storeId: string): string {
  return `/dashboard/customers/${customerId}/stores/${storeId}/payment`;
}

function parseMode(value: unknown): PaymentIntegrationMode | null {
  return value === "sandbox" || value === "live" ? value : null;
}

export async function savePaymentKeysAction(
  customerId: string,
  storeId: string,
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const secretKey = String(formData.get("secretKey") ?? "").trim();
  const mode = parseMode(formData.get("mode"));
  if (apiKey.length < KEY_MIN_LENGTH || apiKey.length > KEY_MAX_LENGTH || secretKey.length < KEY_MIN_LENGTH || secretKey.length > KEY_MAX_LENGTH) {
    return { error: "API anahtarı ve gizli anahtarın ikisini de girin.", success: null };
  }
  if (!mode) return { error: "Geçerli bir mod seçin (Test / Canlı).", success: null };

  try {
    await savePaymentKeys(storeId, { apiKey, secretKey, mode });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kaydedilemedi.", success: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "integration.iyzico.update",
    entityType: "store",
    entityId: storeId,
    metadata: { field: "keys", mode, apiKeyLast4: apiKey.slice(-4) },
  });

  revalidatePath(paymentPath(customerId, storeId));
  return { error: null, success: 'Anahtarlar kaydedildi. Şimdi "Bağlantıyı Test Et" ile doğrulayın, sonra entegrasyonu aktif edin.' };
}

export async function removePaymentKeysAction(
  customerId: string,
  storeId: string,
  _prevState: PaymentFormState,
): Promise<PaymentFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  try {
    await savePaymentKeys(storeId, null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kaldırılamadı.", success: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "integration.iyzico.update",
    entityType: "store",
    entityId: storeId,
    metadata: { field: "keys", removed: true },
  });

  revalidatePath(paymentPath(customerId, storeId));
  return { error: null, success: "Anahtarlar kaldırıldı ve entegrasyon pasife alındı — vitrinde kart seçeneği görünmez." };
}

export async function testPaymentConnectionAction(
  customerId: string,
  storeId: string,
  _prevState: PaymentFormState,
): Promise<PaymentFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  const credentials = await getPaymentIntegrationCredentials(storeId, { requireActive: false });
  if (!credentials) return { error: "Önce API anahtarı ve gizli anahtarı kaydedin.", success: null };

  try {
    await testIyzicoConnection(credentials);
    const message = `Bağlantı başarılı (${credentials.mode === "live" ? "CANLI" : "test"} ortamı).`;
    await recordPaymentConnectionTest(storeId, true, message);
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "integration.iyzico.update",
      entityType: "store",
      entityId: storeId,
      metadata: { field: "connection_test", ok: true, mode: credentials.mode },
    });
    revalidatePath(paymentPath(customerId, storeId));
    return { error: null, success: message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bağlantı kurulamadı.";
    await recordPaymentConnectionTest(storeId, false, message);
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "integration.iyzico.update",
      entityType: "store",
      entityId: storeId,
      metadata: { field: "connection_test", ok: false, mode: credentials.mode },
    });
    revalidatePath(paymentPath(customerId, storeId));
    return { error: `Bağlantı hatası: ${message}`, success: null };
  }
}

export async function updatePaymentSettingsAction(
  customerId: string,
  storeId: string,
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const { user } = await requireStoreAdminAccess(storeId);

  const mode = parseMode(formData.get("mode"));
  if (!mode) return { error: "Geçerli bir mod seçin (Test / Canlı).", success: null };
  const isActive = formData.get("isActive") === "on";

  if (isActive) {
    const credentials = await getPaymentIntegrationCredentials(storeId, { requireActive: false });
    if (!credentials) return { error: "Aktif etmek için önce anahtarları kaydedin.", success: null };
  }

  try {
    await updatePaymentSettings(storeId, { mode, isActive });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kaydedilemedi.", success: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "integration.iyzico.update",
    entityType: "store",
    entityId: storeId,
    metadata: { field: "settings", mode, isActive },
  });

  revalidatePath(paymentPath(customerId, storeId));
  return { error: null, success: isActive ? "Ayarlar kaydedildi — vitrinde \"Kredi / Banka Kartı\" seçeneği görünür." : "Ayarlar kaydedildi — kart seçeneği vitrinde gizli." };
}
