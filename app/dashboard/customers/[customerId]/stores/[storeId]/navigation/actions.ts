"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStoreEditorAccess, requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  storeNavigationMenuFormSchema,
  storeNavigationItemFormSchema,
  STORE_MENU_TYPES,
} from "@/lib/validation/store-navigation";
import { storeNavigationTag } from "@/lib/commerce/cache-tags";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { StoreNavigationFormState } from "./form-state";

type MenuType = (typeof STORE_MENU_TYPES)[number];

/** Ensures a menu of this type exists for the store, creating it if not (store_editor+). Idempotent — `unique(store_id, menu_type)` is the real guard. */
export async function ensureNavigationMenuAction(customerId: string, storeId: string, menuType: MenuType): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = storeNavigationMenuFormSchema.safeParse({ menuType });
  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("store_navigation_menus")
    .select("id")
    .eq("store_id", storeId)
    .eq("menu_type", parsed.data.menuType)
    .maybeSingle();
  if (existing) return;

  const { data: menu, error } = await supabase
    .from("store_navigation_menus")
    .insert({ store_id: storeId, menu_type: parsed.data.menuType })
    .select("id")
    .single();
  if (error || !menu) {
    console.error("[navigation] failed to create menu:", error?.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation_menu.create",
    entityType: "store_navigation_menu",
    entityId: menu.id,
    metadata: { menuType: parsed.data.menuType },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/navigation`);
}

export async function createNavigationItemAction(
  customerId: string,
  storeId: string,
  menuId: string,
  _prevState: StoreNavigationFormState,
  formData: FormData,
): Promise<StoreNavigationFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = storeNavigationItemFormSchema.safeParse({
    label: formData.get("label"),
    url: formData.get("url"),
    parentItemId: formData.get("parentItemId") || undefined,
    isActive: formData.get("isActive") ?? "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();

  // Append at the end — gap-based sort_order, never trusts a client value.
  const { data: maxRow } = await supabase
    .from("store_navigation_items")
    .select("sort_order")
    .eq("menu_id", menuId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? 0) + 10;

  const { data: item, error } = await supabase
    .from("store_navigation_items")
    .insert({
      menu_id: menuId,
      store_id: storeId,
      parent_item_id: parsed.data.parentItemId || null,
      label: parsed.data.label,
      url: parsed.data.url,
      is_active: parsed.data.isActive,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single();

  if (error || !item) {
    return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation_item.create",
    entityType: "store_navigation_item",
    entityId: item.id,
    metadata: { label: parsed.data.label, url: parsed.data.url },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/navigation`);
  revalidateTag(storeNavigationTag(storeId), "max");
  return { error: null };
}

export async function updateNavigationItemAction(
  customerId: string,
  storeId: string,
  itemId: string,
  _prevState: StoreNavigationFormState,
  formData: FormData,
): Promise<StoreNavigationFormState> {
  const { user } = await requireStoreEditorAccess(storeId);

  const parsed = storeNavigationItemFormSchema.safeParse({
    label: formData.get("label"),
    url: formData.get("url"),
    parentItemId: formData.get("parentItemId") || undefined,
    isActive: formData.get("isActive") ?? "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_navigation_items")
    .update({
      label: parsed.data.label,
      url: parsed.data.url,
      parent_item_id: parsed.data.parentItemId || null,
      is_active: parsed.data.isActive,
    })
    .eq("id", itemId)
    .eq("store_id", storeId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation_item.update",
    entityType: "store_navigation_item",
    entityId: itemId,
    metadata: { label: parsed.data.label, url: parsed.data.url, isActive: parsed.data.isActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/navigation`);
  revalidateTag(storeNavigationTag(storeId), "max");
  return { error: null };
}

/** Bound per-row via `.bind(null, customerId, storeId, itemId, nextActive)` — a lighter-weight toggle than a full updateNavigationItemAction submit. store_editor+ (deactivating is reversible, not the critical "kalıcı silme" tier). */
export async function toggleNavigationItemActiveAction(
  customerId: string,
  storeId: string,
  itemId: string,
  nextActive: boolean,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("store_navigation_items")
    .update({ is_active: nextActive })
    .eq("id", itemId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[navigation] failed to toggle item active state:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation_item.update",
    entityType: "store_navigation_item",
    entityId: itemId,
    metadata: { isActive: nextActive },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/navigation`);
  revalidateTag(storeNavigationTag(storeId), "max");
}

/** Permanent delete — store_admin+ ONLY (store_editor may only deactivate via updateNavigationItemAction). */
export async function deleteNavigationItemAction(customerId: string, storeId: string, itemId: string): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("store_navigation_items").delete().eq("id", itemId).eq("store_id", storeId);
  if (error) {
    console.error("[navigation] failed to delete item:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation_item.delete",
    entityType: "store_navigation_item",
    entityId: itemId,
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/navigation`);
  revalidateTag(storeNavigationTag(storeId), "max");
}

/**
 * Reorder — store_editor+. Takes a direction on ONE item; the server
 * fetches the CURRENT full ordered list from the DB (never a
 * client-submitted order), swaps the target with its neighbor, and
 * rewrites gap-based sort_order (10/20/30/...) for the WHOLE menu in one
 * pass — this is the "server transaction recomputes its own ordering"
 * requirement (2026-08-25 karar madde 6). Drag-and-drop UI is intentionally
 * NOT implemented this phase (see final report) — these buttons are the
 * server-authoritative equivalent without adding a new client-side
 * dependency mid-implementation.
 */
export async function moveNavigationItemAction(
  customerId: string,
  storeId: string,
  menuId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: items, error } = await supabase
    .from("store_navigation_items")
    .select("id, sort_order")
    .eq("menu_id", menuId)
    .order("sort_order", { ascending: true });

  if (error || !items) {
    console.error("[navigation] failed to load items for reorder:", error?.message);
    return;
  }

  const index = items.findIndex((item) => item.id === itemId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= items.length) return;

  const reordered = [...items];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  await Promise.all(
    reordered.map((item, position) =>
      supabase
        .from("store_navigation_items")
        .update({ sort_order: (position + 1) * 10 })
        .eq("id", item.id),
    ),
  );

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "navigation_item.reorder",
    entityType: "store_navigation_menu",
    entityId: menuId,
    metadata: { itemId, direction },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/navigation`);
  revalidateTag(storeNavigationTag(storeId), "max");
}
