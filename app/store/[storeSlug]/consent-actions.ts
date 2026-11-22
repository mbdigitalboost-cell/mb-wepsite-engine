"use server";

import { headers } from "next/headers";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { getPublishedLegalDocuments } from "@/lib/legal/store-legal";
import { getStoreTrackingSettings } from "@/lib/tracking/store-tracking-server";

/**
 * Faz 35 — çerez kararının İSPAT kaydı (cookie_consent_records; yalnız
 * service-role yazar). Ham IP / user-agent YAZILMAZ; IP yalnız bellekteki
 * deneme sınırının anahtarında kullanılır. consent_version sunucudaki
 * güncel değerdir (istemciye güvenilmez); çerez politikası sürümü de
 * kaydedilir. Kayıt başarısız olsa da ziyaretçinin seçimi tarayıcıda geçerli
 * kalır (seçim yine uygulanır; yalnız ispat kaydı eksik olur ve loglanır).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["accept_all", "reject_all", "custom", "withdraw"]);

export async function recordCookieConsentAction(
  storeSlug: string,
  input: { consentId: string; analytics: boolean; marketing: boolean; action: string },
): Promise<{ ok: boolean; consentVersion: number | null }> {
  if (!UUID.test(String(input?.consentId ?? "")) || !ACTIONS.has(String(input?.action ?? ""))) return { ok: false, consentVersion: null };
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { ok: false, consentVersion: null };

  const headerList = await headers();
  const ip = getClientIp(new Request("http://internal", { headers: headerList }));
  if (!rateLimit(`cookie-consent:${store.id}:${ip}`, { limit: 30, windowMs: 10 * 60 * 1000 }).allowed) {
    return { ok: false, consentVersion: null };
  }

  const [settings, documents] = await Promise.all([getStoreTrackingSettings(store.id), getPublishedLegalDocuments(store.id)]);
  const action = input.action as "accept_all" | "reject_all" | "custom" | "withdraw";
  const withdraw = action === "withdraw";
  const { error } = await createSupabaseAdminClient()
    .from("cookie_consent_records")
    .insert({
      store_id: store.id,
      consent_id: input.consentId,
      analytics: withdraw ? false : Boolean(input.analytics),
      marketing: withdraw ? false : Boolean(input.marketing),
      consent_version: settings.consentVersion,
      cookie_policy_version: documents.get("cookies")?.version ?? null,
      action,
    });
  if (error) {
    console.error("[cookie-consent] record failed:", error.message);
    return { ok: false, consentVersion: settings.consentVersion };
  }
  return { ok: true, consentVersion: settings.consentVersion };
}
