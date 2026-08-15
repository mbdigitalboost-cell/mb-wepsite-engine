"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { seoFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { SeoFormState } from "./form-state";

/**
 * Site-wide SEO only (page_id IS NULL) — seo_settings has no `status`
 * column (see supabase/customer-template/migrations/0003), it's config,
 * not draft/published content, so there's no publish step here, just
 * save. A blank field is stored as `null` — lib/cms/adapters/seo.ts's
 * caller falls back to the existing static SEO behavior for anything
 * `null`, never inventing copy.
 */
function toRow(parsed: {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
}) {
  return {
    title: parsed.title || null,
    description: parsed.description || null,
    canonical: parsed.canonical || null,
    og_image: parsed.ogImage || null,
    robots_index: parsed.robotsIndex,
    robots_follow: parsed.robotsFollow,
  };
}

export async function saveSeoAction(
  customerId: string,
  seoId: string | null,
  _prevState: SeoFormState,
  formData: FormData,
): Promise<SeoFormState> {
  const { user } = await requireCustomerAccess(customerId);

  const parsed = seoFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    canonical: formData.get("canonical"),
    ogImage: formData.get("ogImage"),
    robotsIndex: formData.get("robotsIndex") === "on",
    robotsFollow: formData.get("robotsFollow") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data);
  let resolvedId = seoId;

  if (seoId) {
    const { error } = await connection.client.from("seo_settings").update(row).eq("id", seoId);
    if (error) return { error: `Kaydedilemedi: ${error.message}` };
  } else {
    const { data, error } = await connection.client.from("seo_settings").insert({ ...row, page_id: null }).select("id").single();
    if (error || !data) return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
    resolvedId = data.id;
  }

  await logAuditEvent({ userId: user.id, customerId, action: "seo.update", entityType: "seo_settings", entityId: resolvedId, metadata: row });
  revalidatePath(`/dashboard/customers/${customerId}/seo`);
  return { error: null };
}
