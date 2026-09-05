"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { navigationItemFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { triggerRemoteRevalidation } from "@/lib/cms/dashboard/trigger-revalidation";
import type { NavigationItemFormState } from "./form-state";
import type { ContentStatus } from "@/lib/cms/customer-types";

function toRow(parsed: { label: string; href: string; sortOrder: number }) {
  return { label: parsed.label, href: parsed.href, sort_order: parsed.sortOrder };
}

export async function createNavigationItemAction(
  customerId: string,
  _prevState: NavigationItemFormState,
  formData: FormData,
): Promise<NavigationItemFormState> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = navigationItemFormSchema.safeParse({
    label: formData.get("label"),
    href: formData.get("href"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data);
  const { data, error } = await connection.client
    .from("navigation_items")
    .insert({ ...row, status: "draft" as ContentStatus })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation.create",
    entityType: "navigation_items",
    entityId: data.id,
    metadata: row,
  });

  revalidatePath(`/dashboard/customers/${customerId}/navigation`);
  // Faz 6C: navigation_items header/footer'ı (layout.tsx üzerinden TÜM
  // public sayfaları) etkiliyor — panel-local revalidatePath'in
  // (yukarıda) public deployment'a hiçbir etkisi yok (bkz. FAZ 4G/FAZ 6B
  // teşhisi). `/api/revalidate`'in kendi "/" özel-durumu (`revalidatePath("/","layout")`)
  // header/footer'ı paylaşan her route'u kapsıyor — ayrıca path eklemeye
  // gerek yok.
  await triggerRemoteRevalidation(customerId, ["/"]);
  redirect(`/dashboard/customers/${customerId}/navigation/${data.id}`);
}

export async function updateNavigationItemAction(
  customerId: string,
  itemId: string,
  _prevState: NavigationItemFormState,
  formData: FormData,
): Promise<NavigationItemFormState> {
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = navigationItemFormSchema.safeParse({
    label: formData.get("label"),
    href: formData.get("href"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data);
  const { error } = await connection.client.from("navigation_items").update(row).eq("id", itemId);
  if (error) return { error: `Kaydedilemedi: ${error.message}` };

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation.update",
    entityType: "navigation_items",
    entityId: itemId,
    metadata: row,
  });

  revalidatePath(`/dashboard/customers/${customerId}/navigation`);
  revalidatePath(`/dashboard/customers/${customerId}/navigation/${itemId}`);
  // Faz 6C: bkz. createNavigationItemAction'daki yorum.
  await triggerRemoteRevalidation(customerId, ["/"]);
  return { error: null };
}

export async function setNavigationItemStatusAction(
  customerId: string,
  itemId: string,
  nextStatus: ContentStatus,
): Promise<void> {
  const { user } = await requireCustomerWriteAccess(customerId);
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  const { error } = await connection.client.from("navigation_items").update({ status: nextStatus }).eq("id", itemId);
  if (error) {
    console.error("[navigation] failed to set status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action:
      nextStatus === "published"
        ? "navigation.publish"
        : nextStatus === "archived"
          ? "navigation.archive"
          : "navigation.update",
    entityType: "navigation_items",
    entityId: itemId,
    metadata: { status: nextStatus },
  });

  revalidatePath(`/dashboard/customers/${customerId}/navigation`);
  revalidatePath(`/dashboard/customers/${customerId}/navigation/${itemId}`);
  // Faz 6C: bkz. createNavigationItemAction'daki yorum.
  await triggerRemoteRevalidation(customerId, ["/"]);
}

export async function deleteNavigationItemAction(customerId: string, itemId: string): Promise<void> {
  const { user } = await requireCustomerWriteAccess(customerId);
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  const { error } = await connection.client.from("navigation_items").delete().eq("id", itemId);
  if (error) {
    console.error("[navigation] failed to delete:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation.delete",
    entityType: "navigation_items",
    entityId: itemId,
  });

  revalidatePath(`/dashboard/customers/${customerId}/navigation`);
  // Faz 6C: bkz. createNavigationItemAction'daki yorum.
  await triggerRemoteRevalidation(customerId, ["/"]);
  redirect(`/dashboard/customers/${customerId}/navigation`);
}
