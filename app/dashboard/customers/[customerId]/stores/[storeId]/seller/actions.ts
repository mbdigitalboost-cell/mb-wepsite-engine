"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";

/**
 * Faz 33 — satıcı kimliği (store_seller_profiles). store_admin+ (Faz 29
 * guard: URL müşterisi mağazanın gerçek müşterisi değilse 404; RLS:
 * is_store_admin_member). Boş bırakılan alan NULL kaydedilir → metinlerde
 * o satır çıkmaz. Denetim kaydına değerler değil, yalnız değişen alan
 * adları yazılır.
 */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const schema = z.object({
  legalName: z.string().trim().min(1, "Ticari unvan zorunlu.").max(200),
  ownerName: optional(200),
  taxNumber: optional(11).refine((value) => value === null || /^[0-9]{10,11}$/.test(value), "Vergi/TC kimlik no 10 ya da 11 hane olmalı."),
  taxOffice: optional(120),
  mersisNumber: optional(16).refine((value) => value === null || /^[0-9]{16}$/.test(value), "MERSİS no 16 hane olmalı."),
  address: optional(500),
  phone: optional(40),
  email: optional(200).refine((value) => value === null || z.email().safeParse(value).success, "Geçerli bir e-posta girin."),
  kepAddress: optional(200),
  etbisInfo: optional(300),
  etbisUrl: optional(500).refine((value) => value === null || /^https:\/\/\S+$/.test(value), "ETBİS bağlantısı https:// ile başlamalı."),
});

const FIELD_TO_COLUMN = {
  legalName: "legal_name",
  ownerName: "owner_name",
  taxNumber: "tax_number",
  taxOffice: "tax_office",
  mersisNumber: "mersis_number",
  address: "address",
  phone: "phone",
  email: "email",
  kepAddress: "kep_address",
  etbisInfo: "etbis_info",
  etbisUrl: "etbis_url",
} as const;

export async function updateSellerProfileAction(customerId: string, storeId: string, formData: FormData): Promise<void> {
  const { user } = await requireStoreAdminAccess(storeId, customerId);
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/seller`;

  const raw = Object.fromEntries(Object.keys(FIELD_TO_COLUMN).map((key) => [key, String(formData.get(key) ?? "")]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) redirect(`${base}?hata=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Form geçersiz.")}`);

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("store_seller_profiles").select("*").eq("store_id", storeId).maybeSingle();

  const row = {
    store_id: storeId,
    legal_name: parsed.data.legalName,
    owner_name: parsed.data.ownerName,
    tax_number: parsed.data.taxNumber,
    tax_office: parsed.data.taxOffice,
    mersis_number: parsed.data.mersisNumber,
    address: parsed.data.address,
    phone: parsed.data.phone,
    email: parsed.data.email,
    kep_address: parsed.data.kepAddress,
    etbis_info: parsed.data.etbisInfo,
    etbis_url: parsed.data.etbisUrl,
    updated_by: user.id,
  };
  const { error } = await supabase.from("store_seller_profiles").upsert(row, { onConflict: "store_id" });
  if (error) {
    console.error("[seller-profile] save failed:", error.message);
    redirect(`${base}?hata=${encodeURIComponent("Kaydedilemedi. Migration 0048 uygulandı mı?")}`);
  }

  const changedFields = Object.entries(FIELD_TO_COLUMN)
    .filter(([, column]) => (before as Record<string, unknown> | null)?.[column] !== row[column])
    .map(([field]) => field);

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "store.seller_profile_update",
    entityType: "store",
    entityId: storeId,
    metadata: { changedFields, created: !before },
  });

  revalidatePath(base);
  redirect(`${base}?kaydedildi=1`);
}
