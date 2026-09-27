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
 * Faz 12 devamı (migration 0037) — bir 'code' girişinin sonucu artık TEK bir
 * ResolvedDiscount|null değil, ayrım yapılabilir bir sonuç: "hiç kod
 * girilmedi" (none) ile "kod girildi ama X sebebiyle geçersiz" (diğer üç
 * durum) arasındaki fark actions.ts'in müşteriye DOĞRU mesajı gösterebilmesi
 * için önemli. 'auto' yolu ise hâlâ sessiz: şartlar karşılanmıyorsa "none"
 * döner, bir hata YOK — auto pasif bir avantaj, müşterinin görmediği bir
 * şart yüzünden hata göstermek yanlış olurdu (bkz. resolveApplicableDiscount'ın
 * kendi yorumu).
 */
export type DiscountResolution =
  | { status: "applied"; discount: ResolvedDiscount }
  | { status: "invalid_code" }
  | { status: "min_order_not_met"; minOrderAmount: number }
  | { status: "usage_limit_reached" }
  | { status: "none" };

interface DiscountCandidateRow {
  id: string;
  discount_type: CustomerDiscountType;
  code: string | null;
  value_type: CustomerDiscountValueType;
  value: number;
  expires_at: string | null;
  max_uses: number | null;
  min_order_amount: number | null;
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
 *
 * DÜRÜSTLÜK NOTU — RACE CONDITION (Faz 12 devamı'nın kendi talimatı gereği
 * açıkça belirtiliyor): max_uses kontrolü burada "şu an kaç kez kullanılmış"
 * sayısını OKUYUP sonra siparişi AYRI bir adımda (actions.ts'teki insert)
 * yazıyor — bu iki adım tek bir DB transaction'ı içinde DEĞİL (createOrderAction
 * zaten hiçbir yerinde explicit bir transaction kullanmıyor, satır satır insert
 * ediyor). Teorik olarak iki eşzamanlı checkout, limiti aynı anda "hâlâ
 * müsait" görüp ikisi de siparişi tamamlayabilir — sonuç, max_uses'in bir
 * fazla aşılması. Bu, küçük ölçekli bir "kişi başı indirim" sistemi için
 * kabul edilebilir bir risk olarak bırakıldı; mükemmel bir kilitleme
 * mekanizması (ör. SELECT ... FOR UPDATE ya da bir DB constraint trigger'ı)
 * bu fazın kapsamı DIŞINDA bırakıldı (görevin kendi "kurmaya çalışma" talimatı).
 */
export async function resolveApplicableDiscount(params: {
  admin: SupabaseClient<Database>;
  storeId: string;
  subtotal: number;
  /** Signed-in storefront customer's auth user id (profiles.id) — null for guest. */
  userId: string | null;
  /** Raw code text from the checkout form, trimmed by the caller is fine either way — this function trims+uppercases before comparing. */
  enteredCode?: string | null;
}): Promise<DiscountResolution> {
  const { admin, storeId, subtotal, userId, enteredCode } = params;
  const normalizedCode = enteredCode?.trim().toUpperCase() || null;

  if (normalizedCode) {
    const { data: codeRows, error: codeError } = await admin
      .from("customer_discounts")
      .select("id, discount_type, code, value_type, value, expires_at, max_uses, min_order_amount")
      .eq("store_id", storeId)
      .eq("discount_type", "code")
      .eq("is_active", true);

    if (codeError) {
      console.error("[commerce/discounts] code lookup failed:", codeError.message);
      return { status: "invalid_code" };
    }

    const now = new Date();
    const match = (codeRows ?? []).find(
      (row) =>
        row.code?.trim().toUpperCase() === normalizedCode && (!row.expires_at || new Date(row.expires_at) > now),
    );
    // Kod girildi ama geçersiz/süresi geçmiş/bulunamadı — sessizce 'auto'ya
    // DÜŞMÜYORUZ: çağıran (actions.ts) bunu kullanıcıya AYRI bir hata olarak
    // gösterecek, farklı bir indirimi sessizce uygulamak yanıltıcı olurdu.
    if (!match) return { status: "invalid_code" };

    return checkLimitsAndBuild(admin, match, subtotal, /* silent */ false);
  }

  if (!userId) return { status: "none" };

  const { data: storeCustomer, error: storeCustomerError } = await admin
    .from("store_customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (storeCustomerError || !storeCustomer) return { status: "none" };

  const { data: autoRow, error: autoError } = await admin
    .from("customer_discounts")
    .select("id, discount_type, code, value_type, value, expires_at, max_uses, min_order_amount")
    .eq("store_id", storeId)
    .eq("store_customer_id", storeCustomer.id)
    .eq("discount_type", "auto")
    .eq("is_active", true)
    .maybeSingle();

  if (autoError || !autoRow) return { status: "none" };
  if (autoRow.expires_at && new Date(autoRow.expires_at) <= new Date()) return { status: "none" };

  // 'auto' — şartlar karşılanmıyorsa SESSİZCE "none" (bkz. bu fonksiyonun
  // kendi doc comment'i: auto pasif bir avantaj, görünmeyen bir şart
  // yüzünden müşteriye hata göstermek yanlış olurdu).
  const result = await checkLimitsAndBuild(admin, autoRow, subtotal, /* silent */ true);
  return result;
}

async function checkLimitsAndBuild(
  admin: SupabaseClient<Database>,
  row: DiscountCandidateRow,
  subtotal: number,
  silent: boolean,
): Promise<DiscountResolution> {
  if (row.min_order_amount !== null && subtotal < Number(row.min_order_amount)) {
    return silent ? { status: "none" } : { status: "min_order_not_met", minOrderAmount: Number(row.min_order_amount) };
  }

  if (row.max_uses !== null) {
    const usageCount = await countDiscountUsage(admin, row.id);
    if (usageCount >= row.max_uses) {
      return silent ? { status: "none" } : { status: "usage_limit_reached" };
    }
  }

  return { status: "applied", discount: buildResolvedDiscount(row, subtotal) };
}

/**
 * `orders.applied_discount_id = <id>` olan satırları SAYIYOR — migration
 * 0037'nin kendi kararı: ayrı bir "usage_count" kolonu YOK, tek doğruluk
 * kaynağı bu. Sayım sorgusu HATA verirse (silent ise "none"/hata değilse
 * "usage_limit_reached" — yani DOLU muamelesi, fail-closed): bir finansal
 * limiti doğrulayamadığımız durumda indirimi UYGULAMAMAK, yanlışlıkla
 * limitin üzerine çıkmaktan daha güvenli bir varsayılan.
 */
async function countDiscountUsage(admin: SupabaseClient<Database>, discountId: string): Promise<number> {
  const { count, error } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("applied_discount_id", discountId);

  if (error) {
    console.error("[commerce/discounts] usage count failed:", error.message);
    return Number.POSITIVE_INFINITY;
  }

  return count ?? 0;
}

function buildResolvedDiscount(row: DiscountCandidateRow, subtotal: number): ResolvedDiscount {
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

/**
 * Admin Aboneler sayfası için — bir indirimin "X/Y kullanıldı" gösterimi.
 * resolveApplicableDiscount'un checkout içindeki AYNI count sorgusu, ikinci
 * bir hesaplama yolu icat edilmedi.
 */
export async function countDiscountUsageForAdmin(admin: SupabaseClient<Database>, discountId: string): Promise<number> {
  const usage = await countDiscountUsage(admin, discountId);
  return Number.isFinite(usage) ? usage : 0;
}
