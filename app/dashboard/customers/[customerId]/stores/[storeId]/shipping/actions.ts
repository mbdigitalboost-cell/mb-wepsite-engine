"use server";

import { revalidatePath } from "next/cache";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { getHandlers } from "@/lib/integrations/basit-kargo";
import {
  getShippingIntegrationSecrets,
  recordShippingConnectionTest,
  saveShippingToken,
  updateShippingSettings,
} from "@/lib/integrations/store-shipping-integration";
import type { ShippingFormState } from "./form-state";

/**
 * Faz 21 — "Kargo Entegrasyonu" admin sayfasının action'ları. Hepsi
 * store_admin+ (requireStoreAdminAccess → requireAal2 dahil): bir API
 * anahtarı kaydetmek/kaldırmak, bir indirim tanımlamak kadar kritik.
 * Token HİÇBİR dönüş değerinde, log'da ya da audit metadata'sında yok —
 * sadece son 4 hanesi (admin sayfasının maskeli gösterimi için).
 */

const TOKEN_MIN_LENGTH = 10;
const TOKEN_MAX_LENGTH = 500;

function shippingPath(customerId: string, storeId: string): string {
  return `/dashboard/customers/${customerId}/stores/${storeId}/shipping`;
}

export async function saveShippingTokenAction(
  customerId: string,
  storeId: string,
  _prevState: ShippingFormState,
  formData: FormData,
): Promise<ShippingFormState> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);

  const token = String(formData.get("apiToken") ?? "").trim();
  if (token.length < TOKEN_MIN_LENGTH || token.length > TOKEN_MAX_LENGTH) {
    return { error: "Geçerli bir Basit Kargo API anahtarı girin.", success: null, handlers: null };
  }

  try {
    await saveShippingToken(storeId, token);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kaydedilemedi.", success: null, handlers: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "integration.basit_kargo.update",
    entityType: "store",
    entityId: storeId,
    metadata: { field: "api_token", tokenLast4: token.slice(-4) },
  });

  revalidatePath(shippingPath(customerId, storeId));
  return { error: null, success: "API anahtarı kaydedildi. Şimdi \"Bağlantıyı Test Et\" ile doğrulayın.", handlers: null };
}

export async function removeShippingTokenAction(
  customerId: string,
  storeId: string,
  _prevState: ShippingFormState,
): Promise<ShippingFormState> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);

  try {
    await saveShippingToken(storeId, null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kaldırılamadı.", success: null, handlers: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "integration.basit_kargo.update",
    entityType: "store",
    entityId: storeId,
    metadata: { field: "api_token", removed: true },
  });

  revalidatePath(shippingPath(customerId, storeId));
  return { error: null, success: "API anahtarı kaldırıldı — otomatik gönderim ve Kargoya Hazırla artık çalışmaz.", handlers: null };
}

export async function testShippingConnectionAction(
  customerId: string,
  storeId: string,
  _prevState: ShippingFormState,
): Promise<ShippingFormState> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);

  const integration = await getShippingIntegrationSecrets(storeId);
  if (!integration?.apiToken) {
    return { error: "Önce bir API anahtarı kaydedin.", success: null, handlers: null };
  }

  try {
    const handlers = await getHandlers(integration.apiToken);
    const message = handlers.length > 0 ? `Bağlantı başarılı — ${handlers.length} kargo firması kullanılabilir.` : "Bağlantı başarılı — hesapta açık kargo firması görünmüyor.";
    await recordShippingConnectionTest(storeId, true, message);
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "integration.basit_kargo.update",
      entityType: "store",
      entityId: storeId,
      metadata: { field: "connection_test", ok: true, handlerCount: handlers.length },
    });
    revalidatePath(shippingPath(customerId, storeId));
    return { error: null, success: message, handlers: handlers.map((handler) => ({ code: handler.code, name: handler.name })) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bağlantı kurulamadı.";
    await recordShippingConnectionTest(storeId, false, message);
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "integration.basit_kargo.update",
      entityType: "store",
      entityId: storeId,
      metadata: { field: "connection_test", ok: false },
    });
    revalidatePath(shippingPath(customerId, storeId));
    return { error: `Bağlantı hatası: ${message}`, success: null, handlers: null };
  }
}

export async function updateShippingSettingsAction(
  customerId: string,
  storeId: string,
  _prevState: ShippingFormState,
  formData: FormData,
): Promise<ShippingFormState> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);

  const defaultDesiRaw = Number(formData.get("defaultDesi") ?? 1);
  if (!Number.isFinite(defaultDesiRaw) || defaultDesiRaw <= 0 || defaultDesiRaw > 500) {
    return { error: "Varsayılan desi/kg 0,1 ile 500 arasında olmalı.", success: null, handlers: null };
  }
  const settings = {
    defaultDesi: Math.round(defaultDesiRaw * 100) / 100,
    autoPushOnConfirm: formData.get("autoPushOnConfirm") === "on",
    isActive: formData.get("isActive") === "on",
  };

  try {
    await updateShippingSettings(storeId, settings);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kaydedilemedi.", success: null, handlers: null };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "integration.basit_kargo.update",
    entityType: "store",
    entityId: storeId,
    metadata: { field: "settings", ...settings },
  });

  revalidatePath(shippingPath(customerId, storeId));
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  return { error: null, success: "Ayarlar kaydedildi.", handlers: null };
}
