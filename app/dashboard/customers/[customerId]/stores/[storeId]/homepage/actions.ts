"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  homepageSectionFormSchema,
  HOMEPAGE_SECTION_CONFIG_SCHEMAS,
  isHomepageSectionTypeKey,
} from "@/lib/validation/homepage-section";
import { storeHomepageTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { HomepageSectionFormState } from "./form-state";
import type { Json } from "@/lib/supabase/types";

/** store_editor+ — content creation, not a critical/admin-only action. */
export async function createHomepageSectionAction(
  customerId: string,
  storeId: string,
  _prevState: HomepageSectionFormState,
  formData: FormData,
): Promise<HomepageSectionFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = homepageSectionFormSchema.safeParse({
    sectionTypeKey: formData.get("sectionTypeKey"),
    internalLabel: formData.get("internalLabel"),
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    linkUrl: formData.get("linkUrl"),
    isActive: formData.get("isActive") ?? "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  // Per-type config validated against its OWN small schema (never arbitrary jsonb) — see lib/validation/homepage-section.ts.
  const configSchema = HOMEPAGE_SECTION_CONFIG_SCHEMAS[parsed.data.sectionTypeKey];
  const configParsed = configSchema.safeParse(
    parsed.data.sectionTypeKey === "hero"
      ? { secondaryCtaLabel: formData.get("config.secondaryCtaLabel"), secondaryCtaHref: formData.get("config.secondaryCtaHref") }
      : {},
  );
  if (!configParsed.success) {
    return { error: configParsed.error.issues[0]?.message ?? "Geçersiz bölüm ayarı." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: maxRow } = await supabase
    .from("store_homepage_sections")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? 0) + 10;

  const { data: section, error } = await supabase
    .from("store_homepage_sections")
    .insert({
      store_id: storeId,
      section_type_key: parsed.data.sectionTypeKey,
      internal_label: parsed.data.internalLabel || null,
      title: parsed.data.title || null,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      link_url: parsed.data.linkUrl || null,
      // configParsed.data is `unknown` here because HOMEPAGE_SECTION_CONFIG_SCHEMAS is keyed by a
      // union of per-type ZodTypeAny schemas — each individual schema's own output is JSON-safe
      // (plain strings, see lib/validation/homepage-section.ts), so this cast is safe.
      config: configParsed.data as Json,
      is_active: parsed.data.isActive,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single();

  if (error || !section) {
    return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "homepage_section.create",
    entityType: "store_homepage_section",
    entityId: section.id,
    metadata: { sectionTypeKey: parsed.data.sectionTypeKey, title: parsed.data.title || null },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/homepage`);
  revalidateTag(storeHomepageTag(storeId), "max");
  return { error: null };
}

export async function updateHomepageSectionAction(
  customerId: string,
  storeId: string,
  sectionId: string,
  sectionTypeKey: string,
  _prevState: HomepageSectionFormState,
  formData: FormData,
): Promise<HomepageSectionFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  if (!isHomepageSectionTypeKey(sectionTypeKey)) {
    return { error: "Geçersiz bölüm tipi." };
  }

  const parsed = homepageSectionFormSchema.safeParse({
    sectionTypeKey,
    internalLabel: formData.get("internalLabel"),
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    linkUrl: formData.get("linkUrl"),
    isActive: formData.get("isActive") ?? "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const configSchema = HOMEPAGE_SECTION_CONFIG_SCHEMAS[parsed.data.sectionTypeKey];
  const configParsed = configSchema.safeParse(
    parsed.data.sectionTypeKey === "hero"
      ? { secondaryCtaLabel: formData.get("config.secondaryCtaLabel"), secondaryCtaHref: formData.get("config.secondaryCtaHref") }
      : {},
  );
  if (!configParsed.success) {
    return { error: configParsed.error.issues[0]?.message ?? "Geçersiz bölüm ayarı." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_homepage_sections")
    .update({
      internal_label: parsed.data.internalLabel || null,
      title: parsed.data.title || null,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      link_url: parsed.data.linkUrl || null,
      // configParsed.data is `unknown` here because HOMEPAGE_SECTION_CONFIG_SCHEMAS is keyed by a
      // union of per-type ZodTypeAny schemas — each individual schema's own output is JSON-safe
      // (plain strings, see lib/validation/homepage-section.ts), so this cast is safe.
      config: configParsed.data as Json,
      is_active: parsed.data.isActive,
    })
    .eq("id", sectionId)
    .eq("store_id", storeId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "homepage_section.update",
    entityType: "store_homepage_section",
    entityId: sectionId,
    metadata: { title: parsed.data.title || null, isActive: parsed.data.isActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/homepage`);
  revalidateTag(storeHomepageTag(storeId), "max");
  return { error: null };
}

/** Bound per-row — lighter-weight than a full update submit. store_editor+ (deactivating is reversible). */
export async function toggleHomepageSectionActiveAction(
  customerId: string,
  storeId: string,
  sectionId: string,
  nextActive: boolean,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_homepage_sections")
    .update({ is_active: nextActive })
    .eq("id", sectionId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[homepage] failed to toggle section active state:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: nextActive ? "homepage_section.activate" : "homepage_section.deactivate",
    entityType: "store_homepage_section",
    entityId: sectionId,
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/homepage`);
  revalidateTag(storeHomepageTag(storeId), "max");
}

/** Permanent delete — store_admin+ ONLY (same split as navigation items). */
export async function deleteHomepageSectionAction(customerId: string, storeId: string, sectionId: string): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_homepage_sections").delete().eq("id", sectionId).eq("store_id", storeId);
  if (error) {
    console.error("[homepage] failed to delete section:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "homepage_section.delete",
    entityType: "store_homepage_section",
    entityId: sectionId,
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/homepage`);
  revalidateTag(storeHomepageTag(storeId), "max");
}

/** Same server-authoritative reorder approach as navigation — see that module's moveNavigationItemAction comment. */
export async function moveHomepageSectionAction(
  customerId: string,
  storeId: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: sections, error } = await supabase
    .from("store_homepage_sections")
    .select("id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error || !sections) {
    console.error("[homepage] failed to load sections for reorder:", error?.message);
    return;
  }

  const index = sections.findIndex((section) => section.id === sectionId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= sections.length) return;

  const reordered = [...sections];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  await Promise.all(
    reordered.map((section, position) =>
      supabase
        .from("store_homepage_sections")
        .update({ sort_order: (position + 1) * 10 })
        .eq("id", section.id),
    ),
  );

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "homepage_section.reorder",
    entityType: "store_homepage_section",
    entityId: sectionId,
    metadata: { direction },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/homepage`);
  revalidateTag(storeHomepageTag(storeId), "max");
}
