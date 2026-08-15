"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerFormSchema } from "@/lib/validation/customer";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { CustomerFormState } from "./form-state";

/**
 * Every export in this file re-runs `requireAdmin()` itself — it does NOT
 * rely on the fact that only admin-visible pages currently render the
 * forms that call these. A Server Action is reachable directly (its own
 * endpoint), so each one must independently reject a non-admin caller
 * regardless of what UI happened to be rendered for them.
 */

export async function createCustomerAction(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const { user } = await requireAdmin();

  const parsed = customerFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({ name: parsed.data.name, slug: parsed.data.slug })
    .select("id")
    .single();

  if (error || !customer) {
    return {
      error:
        error?.code === "23505"
          ? "Bu slug zaten kullanılıyor, başka bir slug seçin."
          : `Müşteri oluşturulamadı: ${error?.message ?? "bilinmeyen hata"}`,
    };
  }

  await logAuditEvent({
    userId: user.id,
    customerId: customer.id,
    action: "customer.create",
    entityType: "customer",
    entityId: customer.id,
    metadata: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.id}`);
}

export async function updateCustomerAction(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const { user } = await requireAdmin();

  const parsed = customerFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ name: parsed.data.name, slug: parsed.data.slug })
    .eq("id", customerId);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Bu slug zaten kullanılıyor, başka bir slug seçin."
          : `Müşteri güncellenemedi: ${error.message}`,
    };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "customer.update",
    entityType: "customer",
    entityId: customerId,
    metadata: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { error: null };
}

/**
 * Bound per-row via `.bind(null, customerId, nextStatus)` and used
 * directly as a `<form action={...}>` — no client component needed for a
 * single-click toggle. Deactivating a customer is deliberately not a
 * delete: nothing about the customer or its websites/users is removed,
 * they simply stop being reachable via the tenant's own login (RLS still
 * allows the admin to see/reactivate them any time).
 */
export async function setCustomerStatusAction(
  customerId: string,
  nextStatus: "active" | "inactive",
): Promise<void> {
  const { user } = await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ status: nextStatus })
    .eq("id", customerId);

  if (error) {
    console.error("[customers] failed to set status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: nextStatus === "active" ? "customer.activate" : "customer.deactivate",
    entityType: "customer",
    entityId: customerId,
    metadata: { status: nextStatus },
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);
}
