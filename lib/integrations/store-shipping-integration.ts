import "server-only";

import { randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/config/env";
import { STORE_DOMAINS } from "@/lib/commerce/public/store-domains";

/**
 * Faz 21 — store_shipping_integrations (migration 0039) için TEK erişim
 * noktası. Tabloda hiçbir RLS policy yok ve anon/authenticated revoke
 * edilmiş; bu dosya service-role client kullanır. ÇAĞIRAN TARAF yetki
 * kontrolünü ZATEN geçmiş olmalı (admin sayfası/action'ları
 * requireStoreAdminAccess, sipariş action'ları requireStoreEditorAccess,
 * webhook route'u secret eşleşmesi) — burada ikinci bir kontrol yok,
 * bilerek: bu modül "kim sorabilir"i değil "nasıl okunur"u bilir.
 *
 * Token/secret buradan ÇIKIŞ KURALI:
 *  - getShippingIntegrationSecrets: tam token — SADECE server action/
 *    route içinde, API çağrısı yapmak için. Client'a/sayfaya asla.
 *  - getShippingIntegrationSummary: token maskeli (son 4 hane), secret
 *    yok — admin sayfasının render edebileceği her şey.
 *  - webhook URL'i (secret dahil) admin sayfasında gösterilir; bu
 *    bilinçli — admin'in Basit Kargo paneline yapıştırması gereken tam
 *    adres bu, store_admin+ dışında kimse o sayfayı göremez.
 */

export interface ShippingIntegrationSecrets {
  apiToken: string | null;
  defaultDesi: number;
  autoPushOnConfirm: boolean;
  isActive: boolean;
}

export interface ShippingIntegrationSummary {
  exists: boolean;
  hasToken: boolean;
  tokenLast4: string | null;
  defaultDesi: number;
  autoPushOnConfirm: boolean;
  isActive: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  lastWebhookAt: string | null;
  webhookUrl: string;
}

function generateWebhookSecret(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Webhook adresi: mağazanın özel domaini STORE_DOMAINS'te kayıtlıysa o
 * (https://www.t46store.com gibi), değilse bu deployment'ın kendi
 * NEXT_PUBLIC_SITE_URL'i. Route her iki deployment'ta da aynı kodla
 * çalışır; secret mağazayı çözdüğü için host'un hangisi olduğu önemsiz.
 */
export function buildShippingWebhookUrl(storeSlug: string, webhookSecret: string): string {
  const customDomain = Object.entries(STORE_DOMAINS).find(([, slug]) => slug === storeSlug)?.[0];
  const base = (customDomain ? `https://${customDomain}` : publicEnv.siteUrl).replace(/\/+$/, "");
  return `${base}/api/webhooks/basit-kargo?secret=${encodeURIComponent(webhookSecret)}`;
}

/** Satır yoksa oluşturur (secret otomatik üretilir) — admin sayfası ilk açılışta webhook adresini token'dan ÖNCE gösterebilsin diye. */
export async function ensureShippingIntegration(storeId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("store_shipping_integrations").select("store_id").eq("store_id", storeId).maybeSingle();
  if (data) return;

  const { error } = await admin.from("store_shipping_integrations").insert({ store_id: storeId, webhook_secret: generateWebhookSecret() });
  // Yarış durumu (iki istek aynı anda): PK çakışması zararsız, satır zaten var.
  if (error && error.code !== "23505") {
    throw new Error(`Kargo entegrasyon kaydı oluşturulamadı: ${error.message}`);
  }
}

export async function getShippingIntegrationSecrets(storeId: string): Promise<ShippingIntegrationSecrets | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("store_shipping_integrations")
    .select("api_token, default_desi, auto_push_on_confirm, is_active")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return null;
  return {
    apiToken: data.api_token,
    defaultDesi: Number(data.default_desi),
    autoPushOnConfirm: data.auto_push_on_confirm,
    isActive: data.is_active,
  };
}

export async function getShippingIntegrationSummary(storeId: string, storeSlug: string): Promise<ShippingIntegrationSummary> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("store_shipping_integrations")
    .select("api_token, webhook_secret, default_desi, auto_push_on_confirm, is_active, last_test_at, last_test_ok, last_test_message, last_webhook_at")
    .eq("store_id", storeId)
    .maybeSingle();

  if (!data) {
    return {
      exists: false,
      hasToken: false,
      tokenLast4: null,
      defaultDesi: 1,
      autoPushOnConfirm: true,
      isActive: true,
      lastTestAt: null,
      lastTestOk: null,
      lastTestMessage: null,
      lastWebhookAt: null,
      webhookUrl: "",
    };
  }

  return {
    exists: true,
    hasToken: Boolean(data.api_token),
    tokenLast4: data.api_token ? data.api_token.slice(-4) : null,
    defaultDesi: Number(data.default_desi),
    autoPushOnConfirm: data.auto_push_on_confirm,
    isActive: data.is_active,
    lastTestAt: data.last_test_at,
    lastTestOk: data.last_test_ok,
    lastTestMessage: data.last_test_message,
    lastWebhookAt: data.last_webhook_at,
    webhookUrl: buildShippingWebhookUrl(storeSlug, data.webhook_secret),
  };
}

export async function saveShippingToken(storeId: string, apiToken: string | null): Promise<void> {
  await ensureShippingIntegration(storeId);
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("store_shipping_integrations")
    .update({ api_token: apiToken, last_test_at: null, last_test_ok: null, last_test_message: null })
    .eq("store_id", storeId);
  if (error) throw new Error(`Token kaydedilemedi: ${error.message}`);
}

export async function updateShippingSettings(
  storeId: string,
  settings: { defaultDesi: number; autoPushOnConfirm: boolean; isActive: boolean },
): Promise<void> {
  await ensureShippingIntegration(storeId);
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("store_shipping_integrations")
    .update({
      default_desi: settings.defaultDesi,
      auto_push_on_confirm: settings.autoPushOnConfirm,
      is_active: settings.isActive,
    })
    .eq("store_id", storeId);
  if (error) throw new Error(`Ayarlar kaydedilemedi: ${error.message}`);
}

export async function recordShippingConnectionTest(storeId: string, ok: boolean, message: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("store_shipping_integrations")
    .update({ last_test_at: new Date().toISOString(), last_test_ok: ok, last_test_message: message.slice(0, 500) })
    .eq("store_id", storeId);
}

/** Webhook isteğindeki secret'tan mağazayı çözer — secret UNIQUE (migration 0039), eşleşme yoksa null. */
export async function findStoreByShippingWebhookSecret(secret: string): Promise<{ storeId: string } | null> {
  if (!secret || secret.length < 32 || secret.length > 200) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("store_shipping_integrations")
    .select("store_id")
    .eq("webhook_secret", secret)
    .maybeSingle();
  return data ? { storeId: data.store_id } : null;
}

export async function touchShippingWebhook(storeId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("store_shipping_integrations").update({ last_webhook_at: new Date().toISOString() }).eq("store_id", storeId);
}
