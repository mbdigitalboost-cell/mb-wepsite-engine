import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/config/env";
import { STORE_DOMAINS } from "@/lib/commerce/public/store-domains";
import type { IyzicoCredentials } from "@/lib/integrations/iyzico";
import type { PaymentIntegrationMode } from "@/lib/supabase/types";

/**
 * Faz 22 — store_payment_integrations (migration 0040) için TEK erişim
 * noktası; lib/integrations/store-shipping-integration.ts ile AYNI desen.
 * Tabloda hiçbir RLS policy yok, anon/authenticated revoke edilmiş; bu
 * dosya service-role client kullanır. ÇAĞIRAN TARAF yetki kontrolünü
 * ZATEN geçmiş olmalı (admin sayfası/action'ları requireStoreAdminAccess;
 * vitrin/callback/webhook yolları mağazayı kendi bağlamından çözer ve
 * yalnızca anahtarı API çağrısı için okur, asla dışarı vermez).
 *
 * Anahtar çıkış kuralı:
 *  - getPaymentIntegrationCredentials: tam anahtarlar — SADECE server
 *    kodu içinde iyzico çağrısı yapmak için. Client'a/sayfaya/log'a asla.
 *  - getPaymentIntegrationSummary: maskeli (son 4 hane) — admin sayfasının
 *    render edebileceği her şey.
 *  - isCardPaymentEnabled: vitrin için sadece boolean.
 */

export interface PaymentIntegrationSummary {
  hasApiKey: boolean;
  hasSecretKey: boolean;
  apiKeyLast4: string | null;
  secretKeyLast4: string | null;
  mode: PaymentIntegrationMode;
  isActive: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  lastWebhookAt: string | null;
  webhookUrl: string;
}

/** iyzico paneline (Ayarlar → Firma Ayarları → İşyeri Bildirimleri) yapıştırılacak adres. Mağaza, ?store= ile çözülür — iyzico'da imza başlığı (X-IYZ-SIGNATURE-V3) hesapta açıksa ayrıca doğrulanır. */
export function buildPaymentWebhookUrl(storeId: string, storeSlug: string): string {
  const customDomain = Object.entries(STORE_DOMAINS).find(([, slug]) => slug === storeSlug)?.[0];
  const base = (customDomain ? `https://${customDomain}` : publicEnv.siteUrl).replace(/\/+$/, "");
  return `${base}/api/webhooks/iyzico?store=${encodeURIComponent(storeId)}`;
}

export async function ensurePaymentIntegration(storeId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("store_payment_integrations").select("store_id").eq("store_id", storeId).maybeSingle();
  if (data) return;
  const { error } = await admin.from("store_payment_integrations").insert({ store_id: storeId });
  if (error && error.code !== "23505") {
    throw new Error(`Ödeme entegrasyon kaydı oluşturulamadı: ${error.message}`);
  }
}

/** Tam anahtarlar — null: kayıt yok / anahtar eksik / pasif. `requireActive=false` ile admin test action'ı pasifken de test edebilir. */
export async function getPaymentIntegrationCredentials(
  storeId: string,
  options: { requireActive?: boolean } = {},
): Promise<IyzicoCredentials | null> {
  const { requireActive = true } = options;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("store_payment_integrations")
    .select("api_key, secret_key, mode, is_active")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data || !data.api_key || !data.secret_key) return null;
  if (requireActive && !data.is_active) return null;
  return { apiKey: data.api_key, secretKey: data.secret_key, mode: data.mode };
}

/** Vitrin: "Kredi / Banka Kartı" seçeneği gösterilsin mi? Anahtar çifti dolu VE aktif. */
export async function isCardPaymentEnabled(storeId: string): Promise<boolean> {
  return (await getPaymentIntegrationCredentials(storeId)) !== null;
}

export async function getPaymentIntegrationSummary(storeId: string, storeSlug: string): Promise<PaymentIntegrationSummary> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("store_payment_integrations")
    .select("api_key, secret_key, mode, is_active, last_test_at, last_test_ok, last_test_message, last_webhook_at")
    .eq("store_id", storeId)
    .maybeSingle();

  const webhookUrl = buildPaymentWebhookUrl(storeId, storeSlug);
  if (!data) {
    return {
      hasApiKey: false,
      hasSecretKey: false,
      apiKeyLast4: null,
      secretKeyLast4: null,
      mode: "sandbox",
      isActive: false,
      lastTestAt: null,
      lastTestOk: null,
      lastTestMessage: null,
      lastWebhookAt: null,
      webhookUrl,
    };
  }

  return {
    hasApiKey: Boolean(data.api_key),
    hasSecretKey: Boolean(data.secret_key),
    apiKeyLast4: data.api_key ? data.api_key.slice(-4) : null,
    secretKeyLast4: data.secret_key ? data.secret_key.slice(-4) : null,
    mode: data.mode,
    isActive: data.is_active,
    lastTestAt: data.last_test_at,
    lastTestOk: data.last_test_ok,
    lastTestMessage: data.last_test_message,
    lastWebhookAt: data.last_webhook_at,
    webhookUrl,
  };
}

/** Anahtar çifti + mod birlikte kaydedilir (sandbox/canlı anahtarları farklı hesaplardan gelir). null → kaldır. Son test bilgisi sıfırlanır. */
export async function savePaymentKeys(
  storeId: string,
  keys: { apiKey: string; secretKey: string; mode: PaymentIntegrationMode } | null,
): Promise<void> {
  await ensurePaymentIntegration(storeId);
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("store_payment_integrations")
    .update({
      api_key: keys?.apiKey ?? null,
      secret_key: keys?.secretKey ?? null,
      ...(keys ? { mode: keys.mode } : { is_active: false }),
      last_test_at: null,
      last_test_ok: null,
      last_test_message: null,
    })
    .eq("store_id", storeId);
  if (error) throw new Error(`Anahtarlar kaydedilemedi: ${error.message}`);
}

export async function updatePaymentSettings(storeId: string, settings: { mode: PaymentIntegrationMode; isActive: boolean }): Promise<void> {
  await ensurePaymentIntegration(storeId);
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("store_payment_integrations")
    .update({ mode: settings.mode, is_active: settings.isActive })
    .eq("store_id", storeId);
  if (error) throw new Error(`Ayarlar kaydedilemedi: ${error.message}`);
}

export async function recordPaymentConnectionTest(storeId: string, ok: boolean, message: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("store_payment_integrations")
    .update({ last_test_at: new Date().toISOString(), last_test_ok: ok, last_test_message: message.slice(0, 500) })
    .eq("store_id", storeId);
}

export async function touchPaymentWebhook(storeId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("store_payment_integrations").update({ last_webhook_at: new Date().toISOString() }).eq("store_id", storeId);
}
