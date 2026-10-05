import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, OrderStatus, PaymentStatus } from "@/lib/supabase/types";

/**
 * "Siparişlerim" — tenant-bağımsız, paylaşımlı sipariş-sorgulama modülü.
 * Hem ÜYE (giriş yapmış, kendi tüm siparişleri) hem MİSAFİR (sipariş kodu +
 * telefon ile tek sipariş) yolu AYNI PublicOrderWithItems şeklini üretir —
 * app/store/[storeSlug]/siparislerim/** bu ikisini TEK bir paylaşımlı kart
 * bileşeniyle (components/commerce/public/order-status-card.tsx) render
 * ediyor, kod tekrarı yok.
 *
 * ARAŞTIRMA BULGUSU (bu dosyanın var olma sebebi) — order_items/
 * order_item_addons'ın (migration 0029) SADECE store_editor+ (admin) için
 * bir SELECT RLS policy'si var, giriş yapmış bir STOREFRONT müşterisi için
 * HİÇ yok (migration 0031 sadece orders tablosuna
 * `orders_select_own_customer` eklemişti, order_items'e eklemedi — tüm
 * migration dosyaları grep'lenerek doğrulandı). Bu, yeni bir migration
 * GEREKTİRMİYOR — bunun yerine ZATEN bu kod tabanında kurulu bir desen
 * tekrarlanıyor (lib/commerce/public/products.ts'in getPublicProductImages'ı,
 * "anon RLS önce görünürlüğü kanıtlar, admin client SADECE o kanıtlanmış
 * satır(lar) üzerinde son adımı yapar" — kendi doc comment'i): ÜYE yolunda
 * önce `orders` SADECE authenticated client ile (RLS: customer_user_id =
 * auth.uid()) okunuyor — bu adım GERÇEK yetkilendirme kanıtı. O sorgudan
 * dönen order id'leri zaten bu kullanıcıya ait olduğu KANITLANMIŞ durumda;
 * SADECE o id'ler için order_items/order_item_addons'ı admin (service-role)
 * client ile çekmek, "rastgele bir id'yi imzala" değil, "zaten kanıtlanmış
 * bir id kümesinin alt satırlarını getir" — aynı güvenlik sınıfı. MİSAFİR
 * yolunda zaten baştan sona admin client kullanılıyor (orders'ın kendisi de
 * anon'a hiç açık değil).
 */

export interface PublicOrderItem {
  productName: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  addonLabels: string[];
}

export interface PublicOrderWithItems {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  createdAt: string;
  subtotal: number;
  discountAmount: number;
  discountCode: string | null;
  addressCity: string;
  addressDistrict: string;
  addressNeighborhood: string | null;
  addressLine: string;
  carrier: string | null;
  trackingNumber: string | null;
  items: PublicOrderItem[];
}

interface OrderRow {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  created_at: string;
  subtotal: number;
  discount_amount: number;
  discount_code: string | null;
  address_city: string;
  address_district: string;
  address_neighborhood: string | null;
  address_line: string;
  carrier: string | null;
  tracking_number: string | null;
}

const ORDER_COLUMNS =
  "id, order_number, status, payment_status, payment_method, created_at, subtotal, discount_amount, discount_code, address_city, address_district, address_neighborhood, address_line, carrier, tracking_number";

/** Birden fazla sipariş için TEK bir order_items + order_item_addons sorgusu (N+1 değil) — sipariş başına ayrı sorgu yok. */
async function attachItemsToOrders(
  admin: SupabaseClient<Database>,
  storeId: string,
  orders: OrderRow[],
): Promise<PublicOrderWithItems[]> {
  if (orders.length === 0) return [];

  const orderIds = orders.map((order) => order.id);

  const { data: itemRows, error: itemsError } = await admin
    .from("order_items")
    .select("id, order_id, product_name, variant_label, unit_price, quantity, line_total")
    .eq("store_id", storeId)
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("[commerce/public] order-lookup order_items fetch failed:", itemsError.message);
  }
  const items = itemRows ?? [];

  const itemIds = items.map((item) => item.id);
  const { data: addonRows, error: addonsError } =
    itemIds.length > 0
      ? await admin
          .from("order_item_addons")
          .select("order_item_id, addon_name, price_delta")
          .eq("store_id", storeId)
          .in("order_item_id", itemIds)
      : { data: [], error: null };

  if (addonsError) {
    console.error("[commerce/public] order-lookup order_item_addons fetch failed:", addonsError.message);
  }
  const addons = addonRows ?? [];

  const addonLabelsByItemId = new Map<string, string[]>();
  for (const addon of addons) {
    const labels = addonLabelsByItemId.get(addon.order_item_id) ?? [];
    labels.push(`${addon.addon_name} (+${Number(addon.price_delta).toFixed(2)} TL)`);
    addonLabelsByItemId.set(addon.order_item_id, labels);
  }

  const itemsByOrderId = new Map<string, PublicOrderItem[]>();
  for (const item of items) {
    const list = itemsByOrderId.get(item.order_id) ?? [];
    list.push({
      productName: item.product_name,
      variantLabel: item.variant_label,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
      addonLabels: addonLabelsByItemId.get(item.id) ?? [],
    });
    itemsByOrderId.set(item.order_id, list);
  }

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    createdAt: order.created_at,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discount_amount),
    discountCode: order.discount_code,
    addressCity: order.address_city,
    addressDistrict: order.address_district,
    addressNeighborhood: order.address_neighborhood,
    addressLine: order.address_line,
    carrier: order.carrier,
    trackingNumber: order.tracking_number,
    items: itemsByOrderId.get(order.id) ?? [],
  }));
}

/**
 * ÜYE yolu — `authenticatedClient` ZATEN çağıran tarafından (siparislerim/
 * page.tsx) oluşturulmuş olmalı (createSupabaseStorefrontServerClient,
 * /hesap/page.tsx'teki AYNI desen) — bu fonksiyon kendi client'ını
 * yaratmıyor, session cookie'lerine bu şekilde erişiyor. `orders` sorgusu
 * SADECE bu client ile (RLS: orders_select_own_customer) — gerçek
 * yetkilendirme kanıtı burada. Sonrasında items/addons admin client ile
 * (bkz. bu dosyanın üst doc comment'i).
 */
export async function getOwnStoreCustomerOrders(
  authenticatedClient: SupabaseClient<Database>,
  storeId: string,
  userId: string,
): Promise<PublicOrderWithItems[]> {
  const { data, error } = await authenticatedClient
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("store_id", storeId)
    .eq("customer_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[commerce/public] getOwnStoreCustomerOrders failed:", error.message);
    return [];
  }

  const admin = createSupabaseAdminClient();
  return attachItemsToOrders(admin, storeId, data ?? []);
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * MİSAFİR yolu — baştan sona admin (service-role) client, orders'ın kendisi
 * anon'a hiç açık olmadığı için (migration 0029'un kendi "anon INSERT RLS
 * YOK" kararı — SELECT de yok). Eşleşme: store_id + order_number (defense
 * in depth — order_number zaten global unique) + normalize edilmiş telefon
 * karşılaştırması ("0555 123 45 67" ile "5551234567" aynı sayılır, sadece
 * rakamlar karşılaştırılıyor). Eşleşmezse null — actions.ts bunu "sipariş
 * yok" ile "telefon tutmuyor" arasında AYRIM YAPMADAN tek bir genel hataya
 * çeviriyor (enumeration'a karşı).
 */
export async function getGuestOrderByNumberAndPhone(
  storeId: string,
  orderNumber: number,
  phone: string,
): Promise<PublicOrderWithItems | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(
      "id, order_number, status, payment_status, payment_method, created_at, subtotal, discount_amount, discount_code, address_city, address_district, address_neighborhood, address_line, carrier, tracking_number, customer_phone",
    )
    .eq("store_id", storeId)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    console.error("[commerce/public] getGuestOrderByNumberAndPhone failed:", error.message);
    return null;
  }
  if (!data) return null;
  if (normalizePhone(data.customer_phone) !== normalizePhone(phone)) return null;

  const [withItems] = await attachItemsToOrders(admin, storeId, [data]);
  return withItems ?? null;
}
