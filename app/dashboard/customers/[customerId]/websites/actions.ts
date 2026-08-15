"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { websiteFormSchema } from "@/lib/validation/website";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { WebsiteFormState } from "./form-state";

/**
 * Website CRUD is admin-only (see Phase 4 spec §3) — a customer user never
 * creates/edits their own website row, only MB Digital Boost does. Every
 * export here calls `requireAdmin()` itself, independent of whichever
 * page happens to render the form.
 */

function readWebsiteForm(formData: FormData) {
  return websiteFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    domain: formData.get("domain"),
    template: formData.get("template"),
    supabaseConnectionKey: formData.get("supabaseConnectionKey"),
  });
}

export async function createWebsiteAction(
  customerId: string,
  _prevState: WebsiteFormState,
  formData: FormData,
): Promise<WebsiteFormState> {
  const { user } = await requireAdmin();

  const parsed = readWebsiteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: website, error } = await supabase
    .from("websites")
    .insert({
      customer_id: customerId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      domain: parsed.data.domain || null,
      template: parsed.data.template || null,
      supabase_connection_key: parsed.data.supabaseConnectionKey,
    })
    .select("id")
    .single();

  if (error || !website) {
    return { error: describeWebsiteWriteError(error?.code, error?.message) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "website.create",
    entityType: "website",
    entityId: website.id,
    metadata: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      domain: parsed.data.domain || null,
      supabaseConnectionKey: parsed.data.supabaseConnectionKey,
    },
  });

  revalidatePath(`/dashboard/customers/${customerId}`);
  revalidatePath("/dashboard/websites");
  redirect(`/dashboard/customers/${customerId}/websites/${website.id}`);
}

export async function updateWebsiteAction(
  customerId: string,
  websiteId: string,
  _prevState: WebsiteFormState,
  formData: FormData,
): Promise<WebsiteFormState> {
  const { user } = await requireAdmin();

  const parsed = readWebsiteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("websites")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      domain: parsed.data.domain || null,
      template: parsed.data.template || null,
      supabase_connection_key: parsed.data.supabaseConnectionKey,
    })
    .eq("id", websiteId)
    .eq("customer_id", customerId);

  if (error) {
    return { error: describeWebsiteWriteError(error.code, error.message) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "website.update",
    entityType: "website",
    entityId: websiteId,
    metadata: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      domain: parsed.data.domain || null,
      supabaseConnectionKey: parsed.data.supabaseConnectionKey,
    },
  });

  revalidatePath(`/dashboard/customers/${customerId}`);
  revalidatePath(`/dashboard/customers/${customerId}/websites/${websiteId}`);
  revalidatePath("/dashboard/websites");
  return { error: null };
}

/** Bound per-row via `.bind(null, customerId, websiteId, nextStatus)`. Deactivate, not delete — see setCustomerStatusAction for the same reasoning. */
export async function setWebsiteStatusAction(
  customerId: string,
  websiteId: string,
  nextStatus: "active" | "inactive",
): Promise<void> {
  const { user } = await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("websites")
    .update({ status: nextStatus })
    .eq("id", websiteId)
    .eq("customer_id", customerId);

  if (error) {
    console.error("[websites] failed to set status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: nextStatus === "active" ? "website.activate" : "website.deactivate",
    entityType: "website",
    entityId: websiteId,
    metadata: { status: nextStatus },
  });

  revalidatePath(`/dashboard/customers/${customerId}`);
  revalidatePath(`/dashboard/customers/${customerId}/websites/${websiteId}`);
  revalidatePath("/dashboard/websites");
}

function describeWebsiteWriteError(code: string | undefined, message: string | undefined): string {
  if (code === "23505") {
    return "Bu slug, domain veya connection key zaten kullanımda — her biri tüm platformda benzersiz olmalı.";
  }
  return `Website kaydedilemedi: ${message ?? "bilinmeyen hata"}`;
}
