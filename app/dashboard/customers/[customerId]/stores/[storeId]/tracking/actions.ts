"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import {
  GA4_ID_PATTERN,
  GOOGLE_ADS_ID_PATTERN,
  GOOGLE_ADS_LABEL_PATTERN,
  META_PIXEL_ID_PATTERN,
  activeToolsSignature,
  type StoreTrackingSettings,
} from "@/lib/tracking/store-tracking";

/**
 * Faz 35 — Mağaza → Takip ve Reklam (store_admin+; Faz 29 guard: URL
 * müşterisi mağazanın gerçek müşterisi değilse 404; RLS: is_store_admin_member).
 * Etkin araç kümesi değişirse:
 *  - consent_version artar → ziyaretçilere yeniden sorulur,
 *  - Çerez Politikası'nın YENİ SÜRÜMÜ oluşturulur (üçüncü taraf bölümü
 *    değişkenle gerçek ayardan dolar; yeni sürümde "hukukçu kontrol etti"
 *    sıfırdır → admin'de uyarı).
 * Kimlikler gizli değildir (sayfa kaynağında görünür) — denetim kaydına tam yazılır.
 */
const optionalId = (pattern: RegExp, message: string, transform: (value: string) => string = (v) => v) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : transform(value)))
    .refine((value) => value === null || pattern.test(value), message);

const schema = z
  .object({
    metaPixelId: optionalId(META_PIXEL_ID_PATTERN, "Meta Pixel kimliği 10–20 haneli bir sayı olmalı."),
    metaEnabled: z.boolean(),
    ga4MeasurementId: optionalId(GA4_ID_PATTERN, "GA4 ölçüm kimliği G-XXXXXXX biçiminde olmalı.", (v) => v.toUpperCase()),
    ga4Enabled: z.boolean(),
    googleAdsId: optionalId(GOOGLE_ADS_ID_PATTERN, "Google Ads kimliği AW-123456789 biçiminde olmalı.", (v) => v.toUpperCase()),
    googleAdsPurchaseLabel: optionalId(GOOGLE_ADS_LABEL_PATTERN, "Dönüşüm etiketi yalnız harf, rakam, - ve _ içerebilir."),
    googleAdsEnabled: z.boolean(),
  })
  .refine((v) => !v.metaEnabled || v.metaPixelId !== null, "Meta Pixel'i açmak için kimlik girin.")
  .refine((v) => !v.ga4Enabled || v.ga4MeasurementId !== null, "Google Analytics'i açmak için ölçüm kimliği girin.")
  .refine((v) => !v.googleAdsEnabled || v.googleAdsId !== null, "Google Ads'i açmak için kimlik girin.");

export async function updateTrackingSettingsAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/tracking`;

  const parsed = schema.safeParse({
    metaPixelId: String(formData.get("metaPixelId") ?? ""),
    metaEnabled: formData.get("metaEnabled") === "on",
    ga4MeasurementId: String(formData.get("ga4MeasurementId") ?? ""),
    ga4Enabled: formData.get("ga4Enabled") === "on",
    googleAdsId: String(formData.get("googleAdsId") ?? ""),
    googleAdsPurchaseLabel: String(formData.get("googleAdsPurchaseLabel") ?? ""),
    googleAdsEnabled: formData.get("googleAdsEnabled") === "on",
  });
  if (!parsed.success) redirect(`${base}?hata=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Form geçersiz.")}`);

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("store_tracking_settings").select("*").eq("store_id", storeId).maybeSingle();

  const toSettings = (row: typeof before, consentVersion: number): StoreTrackingSettings => ({
    metaPixelId: row?.meta_pixel_id ?? null,
    metaEnabled: row?.meta_enabled ?? false,
    ga4MeasurementId: row?.ga4_measurement_id ?? null,
    ga4Enabled: row?.ga4_enabled ?? false,
    googleAdsId: row?.google_ads_id ?? null,
    googleAdsPurchaseLabel: row?.google_ads_purchase_label ?? null,
    googleAdsEnabled: row?.google_ads_enabled ?? false,
    consentVersion,
  });
  const previous = toSettings(before, before?.consent_version ?? 1);
  const next: StoreTrackingSettings = { ...parsed.data, consentVersion: previous.consentVersion };
  const toolsChanged = activeToolsSignature(previous) !== activeToolsSignature(next);
  if (toolsChanged) next.consentVersion = previous.consentVersion + 1;

  const { error } = await supabase.from("store_tracking_settings").upsert(
    {
      store_id: storeId,
      meta_pixel_id: next.metaPixelId,
      meta_enabled: next.metaEnabled,
      ga4_measurement_id: next.ga4MeasurementId,
      ga4_enabled: next.ga4Enabled,
      google_ads_id: next.googleAdsId,
      google_ads_purchase_label: next.googleAdsPurchaseLabel,
      google_ads_enabled: next.googleAdsEnabled,
      consent_version: next.consentVersion,
      updated_by: user.id,
    },
    { onConflict: "store_id" },
  );
  if (error) {
    console.error("[tracking] save failed:", error.message);
    redirect(`${base}?hata=${encodeURIComponent("Kaydedilemedi. Migration 0051 uygulandı mı?")}`);
  }

  let policyVersion: number | null = null;
  if (toolsChanged) {
    // Çerez Politikası yeni sürüm: metin aynı şablon, içerik (üçüncü taraf bölümü) gerçek ayarla değişti.
    const { data: latest } = await supabase
      .from("store_legal_documents")
      .select("title, body, version")
      .eq("store_id", storeId)
      .eq("kind", "cookies")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      const { error: docError } = await supabase
        .from("store_legal_documents")
        .insert({ store_id: storeId, kind: "cookies", title: latest.title, body: latest.body, version: latest.version + 1, updated_by: user.id });
      if (docError) console.error("[tracking] cookie policy version failed:", docError.message);
      else policyVersion = latest.version + 1;
    }
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.tracking_update",
    entityType: "store",
    entityId: storeId,
    metadata: {
      before: { meta: previous.metaEnabled ? previous.metaPixelId : null, ga4: previous.ga4Enabled ? previous.ga4MeasurementId : null, ads: previous.googleAdsEnabled ? previous.googleAdsId : null },
      after: { meta: next.metaEnabled ? next.metaPixelId : null, ga4: next.ga4Enabled ? next.ga4MeasurementId : null, ads: next.googleAdsEnabled ? next.googleAdsId : null },
      ids: { metaPixelId: next.metaPixelId, ga4MeasurementId: next.ga4MeasurementId, googleAdsId: next.googleAdsId, googleAdsPurchaseLabel: next.googleAdsPurchaseLabel },
      consentVersion: next.consentVersion,
      cookiePolicyVersion: policyVersion,
    },
  });

  revalidatePath(base);
  redirect(`${base}?kaydedildi=1${toolsChanged ? `&politika=${policyVersion ?? "hata"}` : ""}`);
}
