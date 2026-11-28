import "server-only";
import { orderGrandTotal } from "@/lib/commerce/shipping-fee";
import { buildIyzicoBasket } from "@/lib/commerce/payments/iyzico-basket";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/auth/audit-log";
import {
  IyzicoApiError,
  IyzicoSignatureError,
  initializeCheckoutForm,
  retrieveCheckoutForm,
  type CheckoutFormRetrieveResult,
  type IyzicoCredentials,
} from "@/lib/integrations/iyzico";
import { getPaymentIntegrationCredentials } from "@/lib/integrations/store-payment-integration";
import { CARD_PAYMENT_METHOD } from "@/lib/validation/order";
import { notifyOrderPlacedAfterResponse } from "@/lib/commerce/order-emails/service";

/**
 * Faz 22 — kart ödemesinin sunucu tarafı akışı (iyzico Checkout Form).
 *
 *  startCardPayment    → siparişten CF başlatma isteğini kurar, token'ı
 *                        siparişe yazar, checkoutFormContent'i döner
 *                        (odeme/[orderId]/page.tsx her açılışta çağırır —
 *                        "Tekrar Dene" = sayfayı yeniden yüklemek).
 *  finalizeCardPayment → callback ve webhook'un ORTAK yolu: token ile
 *                        sonucu iyzico'dan sunucudan sorgular, imza +
 *                        tutar + conversationId/basketId eşleşmesini
 *                        doğrular, İDEMPOTENT "ödendi" yazar (callback ve
 *                        webhook aynı anda gelse de tek güncelleme, tek
 *                        audit — UPDATE ... WHERE payment_status='unpaid'
 *                        + RETURNING: 0 satır döndüyse zaten işlenmiş).
 *
 * Tutar: sipariş kaydından (subtotal - discount_amount), ASLA client'tan.
 * İndirim satırlara ORANTILI dağıtılır, kuruş farkı son satıra yüklenir ki
 * basketItems toplamı paidPrice'a TAM eşit olsun (iyzico kuralı).
 * Bireyselde TCKN girilmediyse iyzico'ya 11111111111 gider (iyzico'nun
 * kendi dokümanındaki yer tutucu); kurumsalda da buyer bir kişi olduğu
 * için aynı yer tutucu — VKN iyzico'ya değil Faz 23'te faturaya gider.
 *
 * Log/audit'te: kart verisi yok (zaten bize hiç gelmiyor), anahtar yok,
 * TCKN yok.
 */

const PLACEHOLDER_IDENTITY_NUMBER = "11111111111";

export const CARD_PAYMENT_NOT_AVAILABLE_MESSAGE = "Bu mağazada kart ile ödeme şu an kullanılamıyor.";

export interface CardPaymentOrder {
  id: string;
  store_id: string;
  order_number: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_provider_token: string | null;
  payment_provider_payment_id: string | null;
  payment_error: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address_city: string;
  address_district: string;
  address_neighborhood: string | null;
  address_line: string;
  subtotal: number;
  discount_amount: number;
  /** Faz 31 */
  shipping_fee: number;
  cod_fee: number;
  billing_type: string;
  billing_name: string | null;
  billing_identity_number: string | null;
  billing_same_as_shipping: boolean;
  billing_address_city: string | null;
  billing_address_district: string | null;
  billing_address_line: string | null;
}

const CARD_ORDER_COLUMNS =
  "id, store_id, order_number, status, payment_status, payment_method, payment_provider_token, payment_provider_payment_id, payment_error, customer_name, customer_phone, customer_email, address_city, address_district, address_neighborhood, address_line, subtotal, discount_amount, shipping_fee, cod_fee, billing_type, billing_name, billing_identity_number, billing_same_as_shipping, billing_address_city, billing_address_district, billing_address_line";

export async function getCardPaymentOrder(storeId: string, orderId: string): Promise<CardPaymentOrder | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("orders").select(CARD_ORDER_COLUMNS).eq("id", orderId).eq("store_id", storeId).maybeSingle();
  return (data as CardPaymentOrder | null) ?? null;
}

/** Faz 31 — müşterinin ödeyeceği toplam: ürünler − indirim + kargo + kapıda ödeme ücreti (tek tanım: lib/commerce/shipping-fee.ts). */
export function orderTotal(order: Pick<CardPaymentOrder, "subtotal" | "discount_amount" | "shipping_fee" | "cod_fee">): number {
  return orderGrandTotal(order);
}

/** Ad / soyad ayrımı: iyzico buyer.name + buyer.surname zorunlu; tek kelimelik isimde soyad "." (boş kabul edilmiyor). */
function splitName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { name: parts[0] ?? "Müşteri", surname: "." };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

/** "0532 123 45 67" / "+90..." → "+905321234567"; çözülemezse undefined (gsmNumber opsiyonel). */
function normalizeGsm(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `+9${digits}`;
  if (digits.length === 12 && digits.startsWith("905")) return `+${digits}`;
  return undefined;
}

// Faz 31 — sepet kurulumu saf modülde (lib/commerce/payments/iyzico-basket.ts).
export { distributeTotalAcrossLines } from "@/lib/commerce/payments/iyzico-basket";

export interface StartCardPaymentResult {
  checkoutFormContent: string;
  paymentPageUrl: string | null;
  token: string;
}

export class CardPaymentUnavailableError extends Error {
  constructor(message = CARD_PAYMENT_NOT_AVAILABLE_MESSAGE) {
    super(message);
    this.name = "CardPaymentUnavailableError";
  }
}

export async function startCardPayment(params: {
  order: CardPaymentOrder;
  customerId: string | null;
  callbackUrl: string;
  buyerIp: string;
}): Promise<StartCardPaymentResult> {
  const { order, customerId, callbackUrl, buyerIp } = params;
  const credentials = await getPaymentIntegrationCredentials(order.store_id);
  if (!credentials) throw new CardPaymentUnavailableError();

  const admin = createSupabaseAdminClient();
  const { data: itemRows } = await admin
    .from("order_items")
    .select("id, product_name, variant_label, line_total")
    .eq("order_id", order.id)
    .eq("store_id", order.store_id)
    .order("created_at", { ascending: true });

  const lines = (itemRows ?? []).map((item) => ({
    id: item.id,
    name: item.variant_label ? `${item.product_name} (${item.variant_label})` : item.product_name,
    lineTotal: Number(item.line_total),
  }));
  if (lines.length === 0) throw new CardPaymentUnavailableError("Siparişte ürün bulunamadı.");

  const total = orderTotal(order);
  if (total <= 0) throw new CardPaymentUnavailableError("Sipariş tutarı sıfır — kart ödemesi gerekmiyor.");

  // Faz 31 — ürün satırları + ayrı "Kargo ücreti" (VIRTUAL) satırı; toplam = price (iyzico 5062 kuralı).
  const basket = buildIyzicoBasket(lines, order);
  const basketItems = basket.items;
  const priceText = basket.price;
  const { name, surname } = splitName(order.customer_name);
  const shippingAddressText = [order.address_line, order.address_neighborhood, order.address_district, order.address_city]
    .filter(Boolean)
    .join(", ");
  const billingSameAsShipping = order.billing_same_as_shipping || !order.billing_address_line;
  const billingAddressText = billingSameAsShipping
    ? shippingAddressText
    : [order.billing_address_line, order.billing_address_district, order.billing_address_city].filter(Boolean).join(", ");
  const billingCity = billingSameAsShipping ? order.address_city : (order.billing_address_city ?? order.address_city);
  const identityNumber =
    order.billing_type === "individual" && order.billing_identity_number && /^\d{11}$/.test(order.billing_identity_number)
      ? order.billing_identity_number
      : PLACEHOLDER_IDENTITY_NUMBER;

  const result = await initializeCheckoutForm(credentials, {
    conversationId: order.id,
    basketId: String(order.order_number),
    price: priceText,
    paidPrice: priceText,
    currency: "TRY",
    callbackUrl,
    buyer: {
      id: order.id,
      name,
      surname,
      identityNumber,
      email: order.customer_email || "musteri@example.com",
      gsmNumber: normalizeGsm(order.customer_phone),
      registrationAddress: shippingAddressText,
      city: order.address_city,
      country: "Turkey",
      ip: buyerIp,
    },
    shippingAddress: { contactName: order.customer_name, city: order.address_city, country: "Turkey", address: shippingAddressText },
    billingAddress: {
      contactName: order.billing_name || order.customer_name,
      city: billingCity,
      country: "Turkey",
      address: billingAddressText,
    },
    basketItems,
  });

  await admin
    .from("orders")
    .update({ payment_provider: "iyzico", payment_provider_token: result.token, payment_error: null })
    .eq("id", order.id)
    .eq("store_id", order.store_id);

  await logAuditEvent({
    userId: null,
    customerId,
    action: "order.payment_init",
    entityType: "order",
    entityId: order.id,
    metadata: { provider: "iyzico", mode: credentials.mode, orderNumber: order.order_number, amount: total },
  });

  return { checkoutFormContent: result.checkoutFormContent, paymentPageUrl: result.paymentPageUrl, token: result.token };
}

export type FinalizeCardPaymentOutcome =
  | { outcome: "paid"; order: CardPaymentOrder; alreadyPaid: boolean }
  | { outcome: "failed"; order: CardPaymentOrder | null; message: string }
  | { outcome: "not_found"; message: string };

/**
 * Callback + webhook ortak yolu. `source` sadece audit'e yazılır.
 * Doğrulama sırası: (1) iyzico'dan sonucu sorgula (kendi anahtarımızla,
 * sunucudan — tarayıcıdan gelen hiçbir alana güvenilmez), (2) sipariş
 * token VEYA conversationId (= order.id) ile bulunur ve mağaza eşleşir,
 * (3) paymentStatus SUCCESS, (4) imza (yanıtta varsa) doğrulandı,
 * (5) paidPrice == sipariş toplamı, (6) basketId == order_number,
 * (7) fraudStatus -1 değil. Herhangi biri düşerse "failed" + payment_error.
 */
export async function finalizeCardPayment(params: {
  storeId: string;
  token: string;
  source: "callback" | "webhook";
  credentials?: IyzicoCredentials | null;
}): Promise<FinalizeCardPaymentOutcome> {
  const { storeId, token, source } = params;
  const credentials = params.credentials ?? (await getPaymentIntegrationCredentials(storeId, { requireActive: false }));
  if (!credentials) return { outcome: "not_found", message: "Ödeme entegrasyonu bulunamadı." };

  const admin = createSupabaseAdminClient();

  let retrieved: CheckoutFormRetrieveResult;
  try {
    retrieved = await retrieveCheckoutForm(credentials, token);
  } catch (error) {
    const message =
      error instanceof IyzicoSignatureError
        ? error.message
        : error instanceof IyzicoApiError
          ? `Ödeme sonucu sorgulanamadı: ${error.message}`
          : "Ödeme sonucu sorgulanamadı.";
    const order = await findOrderForToken(storeId, token, null);
    if (order) await writePaymentFailure(order, message, source);
    return { outcome: "failed", order, message };
  }

  const order = await findOrderForToken(storeId, token, retrieved.conversationId || null);
  if (!order) return { outcome: "not_found", message: "Ödeme için sipariş bulunamadı." };

  if (order.payment_status === "paid") {
    return { outcome: "paid", order, alreadyPaid: true };
  }

  const expectedTotal = orderTotal(order);
  const checks: Array<[boolean, string]> = [
    [retrieved.paymentStatus === "SUCCESS", retrieved.errorMessage ?? "Ödeme bankanız tarafından onaylanmadı."],
    [retrieved.fraudStatus !== -1, "Ödeme güvenlik kontrolünden geçemedi."],
    [!retrieved.conversationId || retrieved.conversationId === order.id, "Ödeme kaydı siparişle eşleşmiyor."],
    [!retrieved.basketId || retrieved.basketId === String(order.order_number), "Ödeme kaydı sipariş numarasıyla eşleşmiyor."],
    [Math.abs(retrieved.paidPrice - expectedTotal) < 0.005, "Ödenen tutar sipariş tutarıyla eşleşmiyor."],
    [retrieved.currency === "TRY", "Ödeme para birimi beklenmedik."],
  ];
  const firstFailure = checks.find(([ok]) => !ok);
  if (firstFailure) {
    await writePaymentFailure(order, firstFailure[1], source, retrieved.paymentId || null);
    return { outcome: "failed", order, message: firstFailure[1] };
  }

  // İDEMPOTENT "ödendi": sadece hâlâ unpaid olan satır güncellenir; 0 satır
  // döndüyse diğer yol (callback/webhook) bizden önce davrandı — ikinci audit yok.
  const { data: updatedRows } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_provider: "iyzico",
      payment_provider_payment_id: retrieved.paymentId || null,
      payment_provider_token: retrieved.token || token,
      payment_error: null,
    })
    .eq("id", order.id)
    .eq("store_id", storeId)
    .eq("payment_status", "unpaid")
    .select("id");

  if (!updatedRows || updatedRows.length === 0) {
    const fresh = (await getCardPaymentOrder(storeId, order.id)) ?? order;
    return { outcome: "paid", order: fresh, alreadyPaid: true };
  }

  const { data: storeRow } = await admin.from("stores").select("customer_id").eq("id", storeId).maybeSingle();
  await logAuditEvent({
    userId: null,
    customerId: storeRow?.customer_id ?? null,
    action: "order.payment_succeeded",
    entityType: "order",
    entityId: order.id,
    metadata: {
      provider: "iyzico",
      source,
      orderNumber: order.order_number,
      paymentId: retrieved.paymentId || null,
      amount: retrieved.paidPrice,
      installment: retrieved.installment,
      cardAssociation: retrieved.cardAssociation,
      lastFourDigits: retrieved.lastFourDigits,
      signatureVerified: retrieved.signatureVerified,
    },
  });

  // Faz 40 — ödeme sunucuda doğrulandı ve "ödendi" işareti BU çağrıda atıldı
  // (idempotent güncelleme 1 satır döndü): sipariş onayı + mağaza bildirimi
  // şimdi gider. Diğer yol (callback/webhook) buraya ulaşmaz; e-posta kaydı da
  // (order_id, kind) tekilliğiyle ikinci gönderimi engeller. Gönderim yanıttan
  // sonra yapılır (after); kural aynı: yalnız ödeme doğrulandıktan sonra. Hata fırlatmaz.
  await notifyOrderPlacedAfterResponse(storeId, order.id);

  const paidOrder: CardPaymentOrder = {
    ...order,
    payment_status: "paid",
    payment_provider_payment_id: retrieved.paymentId || null,
    payment_error: null,
  };
  return { outcome: "paid", order: paidOrder, alreadyPaid: false };
}

async function findOrderForToken(storeId: string, token: string, conversationId: string | null): Promise<CardPaymentOrder | null> {
  const admin = createSupabaseAdminClient();
  if (conversationId) {
    const { data } = await admin
      .from("orders")
      .select(CARD_ORDER_COLUMNS)
      .eq("id", conversationId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (data) return data as CardPaymentOrder;
  }
  const { data } = await admin
    .from("orders")
    .select(CARD_ORDER_COLUMNS)
    .eq("store_id", storeId)
    .eq("payment_provider_token", token)
    .limit(1)
    .maybeSingle();
  return (data as CardPaymentOrder | null) ?? null;
}

async function writePaymentFailure(
  order: CardPaymentOrder,
  message: string,
  source: "callback" | "webhook",
  paymentId: string | null = null,
): Promise<void> {
  if (order.payment_status === "paid") return;
  const admin = createSupabaseAdminClient();
  await admin
    .from("orders")
    .update({ payment_provider: "iyzico", payment_error: message.slice(0, 500) })
    .eq("id", order.id)
    .eq("store_id", order.store_id)
    .eq("payment_status", "unpaid");

  const { data: storeRow } = await admin.from("stores").select("customer_id").eq("id", order.store_id).maybeSingle();
  await logAuditEvent({
    userId: null,
    customerId: storeRow?.customer_id ?? null,
    action: "order.payment_failed",
    entityType: "order",
    entityId: order.id,
    metadata: { provider: "iyzico", source, orderNumber: order.order_number, paymentId, message: message.slice(0, 200) },
  });
}

export function isCardOrder(order: Pick<CardPaymentOrder, "payment_method">): boolean {
  return order.payment_method === CARD_PAYMENT_METHOD;
}
