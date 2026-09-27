import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CustomerDiscountType, CustomerDiscountValueType } from "@/lib/supabase/types";

export interface ResolvedDiscount {
  id: string;
  discountType: CustomerDiscountType;
  valueType: CustomerDiscountValueType;
  value: number;
  /** Snapshot for orders.discount_code — null for 'auto' (no code exists). */
  code: string | null;
  /** Server-computed TL amount, already clamped to [0, subtotal]. */
  amount: number;
}

/**
 * GENEL indirim çözümleme — herhangi bir mağaza için (Aboneler/indirim
 * sistemi de Siparişler gibi genel bir admin özelliği, sadece Taktikalp46'ya
 * özel değil). SADECE app/store/[storeSlug]/sepet/actions.ts'in
 * createOrderAction'ından, zaten sahip olduğu service-role `admin` client'ı
 * ile çağrılıyor — migration 0036'nın kendi başlık yorumunda açıklandığı gibi
 * bu tabloda hiç anon/authenticated SELECT policy'si yok (bir kodun
 * varlığını/değerini numaralandırılabilir kılmamak için), bu yüzden bu
 * fonksiyon KENDİ Supabase client'ını oluşturmuyor, çağırandan alıyor.
 *
 * ÖNCELİK KARARI (kod vs. auto, ikisi de geçerliyse): girilen kod kazanır.
 * Bir kod, müşterinin o anki, açık bir eylemi ("bende bir kodum var") — auto
 * ise pasif, arka planda duran bir avantaj. Müşteri özellikle bir kod
 * girdiyse, onu sessizce farklı bir indirimle değiştirmek kafa karıştırıcı/
 * yanlış olurdu. İkisi ASLA üst üste binmez (tek bir indirim uygulanır).
 *
 * `subtotal` her zaman resolvedLines'tan server-side hesaplanmış toplam
 * olmalı (createOrderAction'daki AYNI ilke) — bu fonksiyon indirim
 * tutarını kendi başına asla client'tan gelen bir değerle hesaplamaz.
 */
export async function resolveApplicableDiscount(params: {
  admin: SupabaseClient<Database>;
  storeId: string;
  subtotal: number;
  /** Signed-in storefront customer's auth user id (profiles.id) — null for guest. */
  userId: string | null;
  /** Raw code text from the checkout form, trimmed by the caller is fine either way — this function trims+uppercases before comparing. */
  enteredCode?: string | null;
}): Promise<ResolvedDiscount | null> {
  const { admin, storeId, subtotal, userId, enteredCode } = params;
  const normalizedCode = enteredCode?.trim().toUpperCase() || null;

  if (normalizedCode) {
    const { data: codeRows, error: codeError } = await admin
      .from("customer_discounts")
      .select("id, discount_type, code, value_type, value, expires_at")
      .eq("store_id", storeId)
      .eq("discount_type", "code")
      .eq("is_active", true);

    if (codeError) {
      console.error("[commerce/discounts] code lookup failed:", codeError.message);
    } else {
      const now = new Date();
      const match = (codeRows ?? []).find(
        (row) =>
          row.code?.trim().toUpperCase() === normalizedCode && (!row.expires_at || new Date(row.expires_at) > now),
      );
      if (match) {
        return buildResolvedDiscount(match, subtotal);
      }
    }
    // Kod girildi ama geçersiz/süresi geçmiş/bulunamadı — sessizce 'auto'ya
    // düşmüyoruz: çağıran (actions.ts) bunu kullanıcıya AYRI bir hata olarak
    // gösterecek ("kod geçersiz"), farklı bir indirimi sessizce uygulamak
    // yanıltıcı olurdu. null dönmek burada "hiç indirim yok" DEĞİL,
    // "kod geçersizdi" anlamına geliyor — çağıran bu ayrımı normalizedCode'un
    // kendisiyle (boş mu değil mi) yapıyor.
    return null;
  }

  if (!userId) return null;

  const { data: storeCustomer, error: storeCustomerError } = await admin
    .from("store_customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (storeCustomerError || !storeCustomer) return null;

  const { data: autoRow, error: autoError } = await admin
    .from("customer_discounts")
    .select("id, discount_type, code, value_type, value, expires_at")
    .eq("store_id", storeId)
    .eq("store_customer_id", storeCustomer.id)
    .eq("discount_type", "auto")
    .eq("is_active", true)
    .maybeSingle();

  if (autoError || !autoRow) return null;
  if (autoRow.expires_at && new Date(autoRow.expires_at) <= new Date()) return null;

  return buildResolvedDiscount(autoRow, subtotal);
}

function buildResolvedDiscount(
  row: {
    id: string;
    discount_type: CustomerDiscountType;
    code: string | null;
    value_type: CustomerDiscountValueType;
    value: number;
  },
  subtotal: number,
): ResolvedDiscount {
  const rawAmount = row.value_type === "percentage" ? (subtotal * Number(row.value)) / 100 : Number(row.value);
  // clamp — migration 0036's own orders_discount_amount_le_subtotal CHECK
  // would reject an insert that violates this anyway, but clamping here
  // means a misconfigured fixed-amount discount larger than the cart still
  // produces a sensible order (100% off, not a DB error) instead of a
  // broken checkout.
  const amount = Math.max(0, Math.min(rawAmount, subtotal));

  return {
    id: row.id,
    discountType: row.discount_type,
    valueType: row.value_type,
    value: Number(row.value),
    code: row.discount_type === "code" ? row.code : null,
    amount: Math.round(amount * 100) / 100,
  };
}
