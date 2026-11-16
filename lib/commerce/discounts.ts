import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { resolveDiscount, type DiscountDataSource, type DiscountRequest, type DiscountResolution, type DiscountRow } from "@/lib/commerce/discount-rules";

export type { DiscountResolution, ResolvedDiscount } from "@/lib/commerce/discount-rules";

/**
 * Faz 32 — indirim kuralları lib/commerce/discount-rules.ts'e taşındı (saf,
 * testli). Bu dosya yalnız Supabase veri kaynağını sağlar.
 *
 * customer_discounts tablosunda anon/authenticated SELECT policy'si YOK
 * (migration 0036 — kodlar numaralandırılamasın); okumalar çağıranın
 * service-role `admin` client'ıyla yapılır. Her sorgu store_id ile
 * filtrelenir (Faz 28/29 izolasyonu).
 */
const DISCOUNT_COLUMNS =
  "id, discount_type, code, value_type, value, expires_at, max_uses, min_order_amount, store_customer_id, guest_email, guest_phone";

export function supabaseDiscountDataSource(admin: SupabaseClient<Database>): DiscountDataSource {
  return {
    async listActiveCodes(storeId) {
      const { data, error } = await admin
        .from("customer_discounts")
        .select(DISCOUNT_COLUMNS)
        .eq("store_id", storeId)
        .eq("discount_type", "code")
        .eq("is_active", true);
      if (error) {
        console.error("[commerce/discounts] code lookup failed:", error.message);
        return null;
      }
      return (data ?? []) as DiscountRow[];
    },
    async findStoreCustomerId(storeId, userId) {
      const { data, error } = await admin.from("store_customers").select("id").eq("store_id", storeId).eq("user_id", userId).maybeSingle();
      if (error || !data) return null;
      return data.id;
    },
    async findActiveAuto(storeId, storeCustomerId) {
      const { data, error } = await admin
        .from("customer_discounts")
        .select(DISCOUNT_COLUMNS)
        .eq("store_id", storeId)
        .eq("store_customer_id", storeCustomerId)
        .eq("discount_type", "auto")
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) return null;
      return data as DiscountRow;
    },
    countUsage: (discountId) => countDiscountUsage(admin, discountId),
  };
}

/** Önizleme ve sipariş oluşturmanın ORTAK çağrısı. */
export async function resolveApplicableDiscount(
  params: DiscountRequest & { admin: SupabaseClient<Database> },
): Promise<DiscountResolution> {
  const { admin, ...request } = params;
  return resolveDiscount(supabaseDiscountDataSource(admin), request);
}

/**
 * orders.applied_discount_id = <id> olan siparişleri sayar (0037: ayrı bir
 * usage_count kolonu yok). Sorgu hatasında +Infinity → "dolu" (fail-closed).
 */
async function countDiscountUsage(admin: SupabaseClient<Database>, discountId: string): Promise<number> {
  const { count, error } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("applied_discount_id", discountId);
  if (error) {
    console.error("[commerce/discounts] usage count failed:", error.message);
    return Number.POSITIVE_INFINITY;
  }
  return count ?? 0;
}

/** Admin Aboneler sayfası — "X/Y kullanıldı" (checkout'la aynı sayım). */
export async function countDiscountUsageForAdmin(admin: SupabaseClient<Database>, discountId: string): Promise<number> {
  const usage = await countDiscountUsage(admin, discountId);
  return Number.isFinite(usage) ? usage : 0;
}
