"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { siteSettingsFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { SiteSettingsFormState } from "./form-state";
import type { ContentStatus } from "@/lib/cms/customer-types";

function toRow(parsed: Record<string, string>) {
  return {
    company_name: parsed.companyName || null,
    alternate_name: parsed.alternateName || null,
    phone: parsed.phone || null,
    whatsapp: parsed.whatsapp || null,
    email: parsed.email || null,
    address: parsed.address || null,
    service_area: parsed.serviceArea || null,
    working_hours: parsed.workingHours || null,
    logo: parsed.logo || null,
    logo_white: parsed.logoWhite || null,
    favicon: parsed.favicon || null,
    primary_color: parsed.primaryColor || null,
    secondary_color: parsed.secondaryColor || null,
    radius: parsed.radius || null,
    button_style: parsed.buttonStyle || null,
  };
}

/**
 * Same singleton-row pattern as content/hero/actions.ts — `settingsId`
 * `null` means "no row yet, create one as a draft"; otherwise updates in
 * place. Only fields a customer actually types are ever written —
 * nothing here invents a value; an empty field is stored as `null`, same
 * "unconfirmed stays null" convention as lib/data/petra/site-config.ts.
 */
export async function saveSiteSettingsAction(
  customerId: string,
  settingsId: string | null,
  _prevState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = siteSettingsFormSchema.safeParse({
    companyName: formData.get("companyName"),
    alternateName: formData.get("alternateName"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    address: formData.get("address"),
    serviceArea: formData.get("serviceArea"),
    workingHours: formData.get("workingHours"),
    logo: formData.get("logo"),
    logoWhite: formData.get("logoWhite"),
    favicon: formData.get("favicon"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    radius: formData.get("radius"),
    buttonStyle: formData.get("buttonStyle"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data);

  let resolvedId = settingsId;

  if (settingsId) {
    const { error } = await connection.client.from("site_settings").update(row).eq("id", settingsId);
    if (error) return { error: `Kaydedilemedi: ${error.message}` };
  } else {
    const { data, error } = await connection.client
      .from("site_settings")
      .insert({ ...row, status: "draft" as ContentStatus })
      .select("id")
      .single();
    if (error || !data) return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
    resolvedId = data.id;
  }

  await logAuditEvent({ userId: user.id, customerId, action: "site.update", entityType: "site_settings", entityId: resolvedId, metadata: row });

  revalidatePath(`/dashboard/customers/${customerId}/settings`);
  // Faz 4B: site_settings artık public layout'ta (header/footer/floating
  // WhatsApp/mobile CTA/logo/tema renkleri) okunuyor — ve `/` route'u
  // build'de statik ("○ Static") üretiliyor. Bu satır olmadan admin
  // kaydeder ama public site bir sonraki deploy'a kadar HİÇ değişmez
  // (bkz. FAZ 4A raporu §15/FAZ 4B raporu). `"layout"` tipi, layout.tsx'i
  // paylaşan HER public route'u (sadece `/` değil) yeniden doğrular —
  // header/footer aynı layout'tan tüm sayfalara render olduğu için gerekli.
  revalidatePath("/", "layout");
  return { error: null };
}

export async function setSiteSettingsStatusAction(customerId: string, settingsId: string, nextStatus: ContentStatus): Promise<void> {
  const { user } = await requireCustomerWriteAccess(customerId);
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  const { error } = await connection.client.from("site_settings").update({ status: nextStatus }).eq("id", settingsId);
  if (error) {
    console.error("[settings] failed to set status:", error.message);
    return;
  }

  await logAuditEvent({ userId: user.id, customerId, action: "site.update", entityType: "site_settings", entityId: settingsId, metadata: { status: nextStatus } });
  revalidatePath(`/dashboard/customers/${customerId}/settings`);
  // Faz 4B: aynı gerekçe — publish/archive de public'in okuduğu
  // `status='published'` satırını değiştirir (bkz. saveSiteSettingsAction).
  revalidatePath("/", "layout");
}
