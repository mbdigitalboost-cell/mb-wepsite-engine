"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { getContentTypeConfig, isContentTypeKey, type ContentTypeConfig } from "@/lib/cms/dashboard/content-types";
import { buildContentFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { ContentFormState } from "./form-state";
import type { ContentStatus } from "@/lib/cms/customer-types";

/**
 * One generic set of actions for all 6 list-shaped content types
 * (services/solutions/projects/campaigns/testimonials/faqs — see
 * lib/cms/dashboard/content-types.ts). `type` is always re-validated
 * against the known config, never trusted as a raw table name.
 *
 * Authorization: `requireCustomerWriteAccess(customerId)` — NOT
 * `requireAdmin()`. Unlike Phase 4's Platform Customer/Website CRUD
 * (intentionally admin-only), content management is something a
 * customer's own user should be able to do for their own customer too —
 * per Phase 6 §4: "Customer: yalnızca kendi müşterisini yönetebilir."
 * Every export here re-checks this itself, independent of which page
 * happened to render the form that called it.
 *
 * Phase 1 RBAC genişlemesi: `requireCustomerAccess` (okuma) yerine
 * `requireCustomerWriteAccess` kullanılıyor — bir `store_viewer` bu
 * müşterinin içeriğini görebilir ama buradan DEĞİŞTİREMEZ (bkz. o
 * fonksiyonun dosya yorumundaki dürüstlük notu: bu ayrımın RLS'te bir
 * karşılığı yok, tek uygulama noktası bu çağrı).
 */

function readFormValues(config: ContentTypeConfig, formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = { sortOrder: formData.get("sortOrder") ?? 0 };
  for (const field of config.fields) {
    values[field.key] = formData.get(field.key);
  }
  return values;
}

function toRow(parsed: Record<string, unknown>, config: ContentTypeConfig): Record<string, unknown> {
  const row: Record<string, unknown> = { sort_order: parsed.sortOrder ?? 0 };
  for (const field of config.fields) {
    const value = parsed[field.key];
    row[field.key] = value === "" || value === undefined ? null : value;
  }
  return row;
}

export async function createContentItemAction(
  customerId: string,
  type: string,
  _prevState: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  if (!isContentTypeKey(type)) return { error: "Geçersiz içerik türü." };
  const config = getContentTypeConfig(type)!;
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = buildContentFormSchema(type).safeParse(readFormValues(config, formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data, config);
  // `type` is a validated ContentTypeKey at runtime, but as a plain
  // `string` parameter it's broader than postgrest-js's table-name union,
  // which collapses Row/Insert/Update inference for a dynamic `.from()`
  // call (same issue worked around in lib/cms/adapters/shared.ts during
  // Phase 5). Casting the client to `any` for this one dynamic call keeps
  // the rest of the file (and every other table's static `.from(...)`
  // call) fully typed — only this generic engine needs it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  const { data, error } = await (connection.client as any)
    .from(type)
    .insert({ ...row, status: "draft" as ContentStatus })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: `${config.auditPrefix}.create`,
    entityType: type,
    entityId: data.id,
    metadata: row as Record<string, string | number | boolean | null>,
  });

  revalidatePath(`/dashboard/customers/${customerId}/content/${type}`);
  redirect(`/dashboard/customers/${customerId}/content/${type}/${data.id}`);
}

export async function updateContentItemAction(
  customerId: string,
  type: string,
  itemId: string,
  _prevState: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  if (!isContentTypeKey(type)) return { error: "Geçersiz içerik türü." };
  const config = getContentTypeConfig(type)!;
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = buildContentFormSchema(type).safeParse(readFormValues(config, formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data, config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment in createContentItemAction above
  const { error } = await connection.client.from(type as any).update(row).eq("id", itemId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: `${config.auditPrefix}.update`,
    entityType: type,
    entityId: itemId,
    metadata: row as Record<string, string | number | boolean | null>,
  });

  revalidatePath(`/dashboard/customers/${customerId}/content/${type}`);
  revalidatePath(`/dashboard/customers/${customerId}/content/${type}/${itemId}`);
  return { error: null };
}

/**
 * Bound per-row/per-page via `.bind(null, customerId, type, itemId, nextStatus)`.
 * Publish system per Phase 6 §18: draft → published → archived, each a
 * separate explicit action, never an implicit side effect of save.
 */
export async function setContentItemStatusAction(
  customerId: string,
  type: string,
  itemId: string,
  nextStatus: ContentStatus,
): Promise<void> {
  if (!isContentTypeKey(type)) return;
  const config = getContentTypeConfig(type)!;
  const { user } = await requireCustomerWriteAccess(customerId);

  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment in createContentItemAction above
  const { error } = await connection.client.from(type as any).update({ status: nextStatus }).eq("id", itemId);
  if (error) {
    console.error(`[content/${type}] failed to set status:`, error.message);
    return;
  }

  const action =
    nextStatus === "published"
      ? `${config.auditPrefix}.publish`
      : nextStatus === "archived"
        ? `${config.auditPrefix}.archive`
        : `${config.auditPrefix}.update`;

  await logAuditEvent({
    userId: user.id,
    customerId,
    action,
    entityType: type,
    entityId: itemId,
    metadata: { status: nextStatus },
  });

  revalidatePath(`/dashboard/customers/${customerId}/content/${type}`);
  revalidatePath(`/dashboard/customers/${customerId}/content/${type}/${itemId}`);
}
