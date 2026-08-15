"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { heroFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { HeroFormState } from "./form-state";
import type { ContentStatus } from "@/lib/cms/customer-types";

/**
 * Site-wide hero only (page_id IS NULL) — matches lib/cms/adapters/hero.ts's
 * read side. `heroId` is `null` for the very first save (creates the row
 * as a draft); afterwards the page always passes the existing row's id so
 * this becomes an update.
 */
function toRow(parsed: Record<string, string>) {
  return {
    heading: parsed.heading,
    subtext: parsed.subtext || null,
    cta_primary_label: parsed.ctaPrimaryLabel || null,
    cta_primary_href: parsed.ctaPrimaryHref || null,
    cta_secondary_label: parsed.ctaSecondaryLabel || null,
    cta_secondary_href: parsed.ctaSecondaryHref || null,
    background_image: parsed.backgroundImage || null,
  };
}

export async function saveHeroAction(
  customerId: string,
  heroId: string | null,
  _prevState: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  const { user } = await requireCustomerAccess(customerId);

  const parsed = heroFormSchema.safeParse({
    heading: formData.get("heading"),
    subtext: formData.get("subtext"),
    ctaPrimaryLabel: formData.get("ctaPrimaryLabel"),
    ctaPrimaryHref: formData.get("ctaPrimaryHref"),
    ctaSecondaryLabel: formData.get("ctaSecondaryLabel"),
    ctaSecondaryHref: formData.get("ctaSecondaryHref"),
    backgroundImage: formData.get("backgroundImage"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data);

  if (heroId) {
    const { error } = await connection.client.from("hero_sections").update(row).eq("id", heroId);
    if (error) return { error: `Kaydedilemedi: ${error.message}` };
    await logAuditEvent({ userId: user.id, customerId, action: "hero.update", entityType: "hero_sections", entityId: heroId, metadata: row });
  } else {
    const { data, error } = await connection.client
      .from("hero_sections")
      .insert({ ...row, page_id: null, status: "draft" as ContentStatus })
      .select("id")
      .single();
    if (error || !data) return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
    await logAuditEvent({ userId: user.id, customerId, action: "hero.create", entityType: "hero_sections", entityId: data.id, metadata: row });
  }

  revalidatePath(`/dashboard/customers/${customerId}/content/hero`);
  return { error: null };
}

export async function setHeroStatusAction(customerId: string, heroId: string, nextStatus: ContentStatus): Promise<void> {
  const { user } = await requireCustomerAccess(customerId);
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  const { error } = await connection.client.from("hero_sections").update({ status: nextStatus }).eq("id", heroId);
  if (error) {
    console.error("[content/hero] failed to set status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: nextStatus === "published" ? "hero.publish" : "hero.update",
    entityType: "hero_sections",
    entityId: heroId,
    metadata: { status: nextStatus },
  });

  revalidatePath(`/dashboard/customers/${customerId}/content/hero`);
}
