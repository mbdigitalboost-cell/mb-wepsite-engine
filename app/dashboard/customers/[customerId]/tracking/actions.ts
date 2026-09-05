"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { trackingFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { triggerRemoteRevalidation } from "@/lib/cms/dashboard/trigger-revalidation";
import type { TrackingFormState } from "./form-state";
import type { TrackingSettingsRow } from "@/lib/cms/customer-types";

/**
 * CRITICAL (Phase 6 §16): `meta_capi_token` is a real secret.
 *  - This whole file only ever runs server-side (Server Action); the
 *    submitted value passes through a plain `<input type="password">` —
 *    never rendered back, never included in any prop passed to a Client
 *    Component (see tracking-form.tsx, which only receives a
 *    `hasToken: boolean`, never the token itself).
 *  - An EMPTY submitted token means "leave the existing token
 *    unchanged" — this is the only way the UI can avoid ever needing to
 *    pre-fill the real value into the input. Only a non-empty submission
 *    overwrites it.
 *  - The audit log metadata below deliberately never includes the token
 *    value itself, only a boolean "was it changed" flag — logs must
 *    never contain secrets, per the Phase 6 instruction.
 *  - Reads/writes happen only through the SERVICE-ROLE customer client
 *    (loadCustomerConnection) — the same one used everywhere else in
 *    this dashboard; there's no separate "public" path that could ever
 *    leak this table's contents (see 0005_customer_rls.sql — anon/
 *    authenticated have NO select policy on tracking_settings at all).
 */
export async function saveTrackingAction(
  customerId: string,
  trackingId: string | null,
  _prevState: TrackingFormState,
  formData: FormData,
): Promise<TrackingFormState> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = trackingFormSchema.safeParse({
    ga4Id: formData.get("ga4Id"),
    gtmId: formData.get("gtmId"),
    metaPixelId: formData.get("metaPixelId"),
    metaCapiEnabled: formData.get("metaCapiEnabled") === "on",
    metaCapiToken: formData.get("metaCapiToken"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const tokenProvided = Boolean(parsed.data.metaCapiToken);
  const row: Partial<TrackingSettingsRow> = {
    ga4_id: parsed.data.ga4Id || null,
    gtm_id: parsed.data.gtmId || null,
    meta_pixel_id: parsed.data.metaPixelId || null,
    meta_capi_enabled: parsed.data.metaCapiEnabled,
  };
  if (tokenProvided) {
    row.meta_capi_token = parsed.data.metaCapiToken;
  }

  let resolvedId = trackingId;
  if (trackingId) {
    const { error } = await connection.client.from("tracking_settings").update(row).eq("id", trackingId);
    if (error) return { error: `Kaydedilemedi: ${error.message}` };
  } else {
    const { data, error } = await connection.client.from("tracking_settings").insert(row).select("id").single();
    if (error || !data) return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
    resolvedId = data.id;
  }

  // Never log the token value itself — only whether it changed.
  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "tracking.update",
    entityType: "tracking_settings",
    entityId: resolvedId,
    metadata: {
      ga4Id: row.ga4_id as string | null,
      gtmId: row.gtm_id as string | null,
      metaPixelId: row.meta_pixel_id as string | null,
      metaCapiEnabled: parsed.data.metaCapiEnabled,
      tokenChanged: tokenProvided,
    },
  });

  revalidatePath(`/dashboard/customers/${customerId}/tracking`);
  // Faz 6C: panel-local revalidatePath'in (yukarıda) public deployment'a
  // etkisi yok (bkz. FAZ 4G/FAZ 6B teşhisi). tracking_settings
  // `layout.tsx` üzerinden TÜM public sayfalara sızıyor — `/api/revalidate`'in
  // "/" özel-durumu (`revalidatePath("/","layout")`) bunu kapsıyor.
  await triggerRemoteRevalidation(customerId, ["/"]);
  return { error: null };
}
