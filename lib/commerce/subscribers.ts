import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface SubscriberRow {
  /** Stable per-row key: `sc:<store_customers.id>` for a registered account, `guest:<normalizedPhone>` for an unmatched guest group. */
  key: string;
  kind: "registered" | "guest";
  /** Only set for kind="registered" — the FK target customer_discounts.store_customer_id expects. */
  storeCustomerId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  orderCount: number;
  /** Sum of (subtotal - discount_amount) across every order counted into this row. */
  totalSpend: number;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * GENEL "Aboneler" agregasyonu — herhangi bir mağaza için (Siparişler gibi
 * genel bir admin özelliği). Bu şemada kayıtlı hesaplar (store_customers,
 * user_id ile) ile misafir siparişler (orders.customer_user_id NULL,
 * sadece customer_phone/customer_email metin alanları) arasında ortak,
 * güvenilir bir anahtar yok — bu yüzden dedup burada, uygulama katmanında,
 * fetch-once-then-Map-lookup deseniyle yapılıyor (attachBrandsToProducts/
 * getPublicProductImages'ın AYNI deseni, lib/commerce/public/products.ts) —
 * bu şemada hiçbir yerde raw SQL/view yok, o alışkanlık burada da bozulmadı.
 *
 * ALGORİTMA:
 *  1) store_customers'ın her satırı kendi başına bir "kayıtlı" abone satırı.
 *     Siparişleri: customer_user_id = bu satırın user_id'si olan TÜM
 *     siparişler, ARTI customer_user_id NULL olan (misafir) ama
 *     customer_email/customer_phone'u bu kayıtlı müşterinin email/phone'una
 *     eşleşen siparişler (aynı kişi önce misafir olarak, sonra hesap açarak
 *     sipariş vermiş olabilir — bu ikisi AYRI satırlar olarak görünmemeli).
 *  2) (1)'de hiçbir kayıtlı müşteriye eşleşmeyen misafir siparişler,
 *     normalize edilmiş telefona göre gruplanıp kendi "misafir" satırlarını
 *     oluşturur (telefon her zaman dolu — orders.customer_phone NOT NULL —
 *     e-posta değil, bu yüzden birincil misafir anahtarı telefon).
 *
 * Sahte/tahmini veri YOK: sipariş sayısı/toplam harcama gerçek `orders`
 * satırlarının kendisinden geliyor, hiç sipariş yoksa store_customers
 * satırı yine de 0 sipariş/0 TL ile listelenir (var olan bir hesap
 * olduğu için — bu "sahte veri" değil, gerçek bir abonenin gerçek
 * durumu).
 */
export async function getStoreSubscribers(
  supabase: SupabaseClient<Database>,
  storeId: string,
): Promise<SubscriberRow[]> {
  const [{ data: customerRows, error: customerError }, { data: orderRows, error: orderError }] = await Promise.all([
    supabase.from("store_customers").select("id, user_id, email, phone, full_name").eq("store_id", storeId),
    supabase
      .from("orders")
      .select("customer_user_id, customer_name, customer_phone, customer_email, subtotal, discount_amount")
      .eq("store_id", storeId),
  ]);

  if (customerError) {
    console.error("[commerce/subscribers] store_customers lookup failed:", customerError.message);
  }
  if (orderError) {
    console.error("[commerce/subscribers] orders lookup failed:", orderError.message);
  }

  const customers = customerRows ?? [];
  const orders = (orderRows ?? []) as Array<{
    customer_user_id: string | null;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    subtotal: number;
    discount_amount: number;
  }>;

  const netTotal = (o: { subtotal: number; discount_amount: number }) => Number(o.subtotal) - Number(o.discount_amount);

  const registeredRows: SubscriberRow[] = [];
  const claimedGuestOrderIndexes = new Set<number>();

  for (const customer of customers) {
    const customerEmail = normalizeEmail(customer.email);
    const customerPhone = normalizePhone(customer.phone);

    let orderCount = 0;
    let totalSpend = 0;

    orders.forEach((order, index) => {
      const isOwnAccountOrder = order.customer_user_id === customer.user_id;
      const isMatchingGuestOrder =
        !order.customer_user_id &&
        ((customerEmail && normalizeEmail(order.customer_email) === customerEmail) ||
          (customerPhone && normalizePhone(order.customer_phone) === customerPhone));

      if (isOwnAccountOrder || isMatchingGuestOrder) {
        orderCount += 1;
        totalSpend += netTotal(order);
        if (isMatchingGuestOrder) claimedGuestOrderIndexes.add(index);
      }
    });

    registeredRows.push({
      key: `sc:${customer.id}`,
      kind: "registered",
      storeCustomerId: customer.id,
      name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      orderCount,
      totalSpend,
    });
  }

  const unclaimedGuestGroups = new Map<string, { name: string; email: string | null; phone: string; orderCount: number; totalSpend: number }>();

  orders.forEach((order, index) => {
    if (order.customer_user_id) return; // registered-account order, already counted above
    if (claimedGuestOrderIndexes.has(index)) return; // folded into a registered customer's row above

    const key = normalizePhone(order.customer_phone) ?? `email:${normalizeEmail(order.customer_email) ?? index}`;
    const existing = unclaimedGuestGroups.get(key);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpend += netTotal(order);
      if (!existing.email && order.customer_email) existing.email = order.customer_email;
    } else {
      unclaimedGuestGroups.set(key, {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        orderCount: 1,
        totalSpend: netTotal(order),
      });
    }
  });

  const guestRows: SubscriberRow[] = [...unclaimedGuestGroups.entries()].map(([key, group]) => ({
    key: `guest:${key}`,
    kind: "guest",
    storeCustomerId: null,
    name: group.name,
    email: group.email,
    phone: group.phone,
    orderCount: group.orderCount,
    totalSpend: group.totalSpend,
  }));

  return [...registeredRows, ...guestRows].sort((a, b) => b.orderCount - a.orderCount);
}
