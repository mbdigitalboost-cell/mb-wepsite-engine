"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeFormSchema } from "@/lib/validation/store";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { StoreFormState } from "./form-state";

/**
 * PHASE 2 — "Stores" Platform CRUD, admin-only (mirrors
 * app/dashboard/customers/actions.ts / customers/[customerId]/websites/actions.ts
 * exactly). `customerId` is NEVER trusted as a bare pass-through — even
 * though the dropdown rendering it is only ever populated server-side
 * after `requireAdmin()`, the actual FK enforcement is the `customers`
 * foreign key on `stores.customer_id` itself (23503 on a bogus id), not
 * this action's own logic. See PHASE_2_FINAL_ARCHITECTURE_PLAN.md §B.
 */

export async function createStoreAction(
  _prevState: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const { user } = await requireAdmin();

  const parsed = storeFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const customerId = formData.get("customerId");
  if (typeof customerId !== "string" || customerId.length === 0) {
    return { error: "Bir müşteri seçin." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: store, error } = await supabase
    .from("stores")
    .insert({ customer_id: customerId, name: parsed.data.name, slug: parsed.data.slug })
    .select("id")
    .single();

  if (error || !store) {
    return { error: describeStoreWriteError(error?.code, error?.message) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.create",
    entityType: "store",
    entityId: store.id,
    metadata: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath("/dashboard/stores");
  revalidatePath(`/dashboard/customers/${customerId}/stores`);
  redirect(`/dashboard/customers/${customerId}/stores/${store.id}`);
}

export async function updateStoreAction(
  customerId: string,
  storeId: string,
  _prevState: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const { user } = await requireAdmin();

  const parsed = storeFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("stores")
    .update({ name: parsed.data.name, slug: parsed.data.slug })
    .eq("id", storeId)
    .eq("customer_id", customerId);

  if (error) {
    return { error: describeStoreWriteError(error.code, error.message) };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.update",
    entityType: "store",
    entityId: storeId,
    metadata: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath("/dashboard/stores");
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}`);
  return { error: null };
}

/** Bound per-row via `.bind(null, customerId, storeId, nextStatus)`. Deactivate, not delete — same reasoning as setCustomerStatusAction. */
export async function setStoreStatusAction(
  customerId: string,
  storeId: string,
  nextStatus: "active" | "inactive",
): Promise<void> {
  const { user } = await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("stores")
    .update({ status: nextStatus })
    .eq("id", storeId)
    .eq("customer_id", customerId);

  if (error) {
    console.error("[stores] failed to set status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: nextStatus === "active" ? "store.activate" : "store.deactivate",
    entityType: "store",
    entityId: storeId,
    metadata: { status: nextStatus },
  });

  revalidatePath("/dashboard/stores");
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}`);
}

function describeStoreWriteError(code: string | undefined, message: string | undefined): string {
  if (code === "23505") {
    return "Bu slug zaten kullanılıyor, başka bir slug seçin.";
  }
  if (code === "23503") {
    return "Seçilen müşteri bulunamadı.";
  }
  return `Mağaza kaydedilemedi: ${message ?? "bilinmeyen hata"}`;
}
