import "server-only";

import { after } from "next/server";
import { runDeferred } from "@/lib/commerce/order-emails/defer";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendViaResend } from "@/lib/notifications/resend";
import { getStorefrontShowcase } from "@/lib/commerce/public/storefront-showcases";
import { findStoreSiteBySlug, getPanelSite } from "@/lib/sites/registry";
import { storePageUrl } from "@/lib/sites/store-metadata";
import { LEGAL_PAGE_LINKS } from "@/lib/legal/links";
import { CARD_PAYMENT_METHOD } from "@/lib/validation/order";
import { orderGrandTotal } from "@/lib/commerce/shipping-fee";
import { getOrderBankTransferDetails } from "@/lib/commerce/payments/bank-transfer-server";
import { formatBankIban } from "@/lib/commerce/payments/bank-transfer";
import {
  canSendOrderPlacedEmails,
  canSendShippedEmail,
  dispatchEmail,
  type DispatchDeps,
  type DispatchOutcome,
  type EmailLogTarget,
  type RenderedEmail,
} from "@/lib/commerce/order-emails/dispatch";
import {
  ONE_OFF_ORDER_KINDS,
  RETURN_KINDS,
  toStoreEmailSettings,
  type EmailKind,
  type StoreEmailSettings,
} from "@/lib/commerce/order-emails/settings";
import {
  renderCancelled,
  renderOrderConfirmation,
  renderReturnEmail,
  renderShipped,
  renderStoreNewOrder,
  renderTestEmail,
  type EmailLegalTexts,
  type EmailOrder,
  type EmailStore,
  type ReturnEmailEvent,
} from "@/lib/commerce/order-emails/templates";

/**
 * Faz 40 — SİPARİŞ E-POSTALARI (sunucu). Sipariş verisini yükler, şablonu
 * üretir ve gönderim çekirdeğine (dispatch.ts) verir.
 *
 * - Yalnız service-role ile çalışır (vitrin ödemesi, sağlayıcı webhook'ları ve
 *   panel aksiyonları aynı fonksiyonları çağırır). Her sorgu `store_id` ile
 *   sınırlıdır: bir mağazanın siparişi için başka mağazanın ayarı okunmaz.
 * - Buradaki hiçbir fonksiyon HATA FIRLATMAZ; e-posta sorunu çağıranın asıl
 *   işini (sipariş, ödeme, durum değişikliği) engellemez.
 * - Kayda e-posta içeriği, telefon, IBAN, kart bilgisi ya da anahtar yazılmaz.
 */

type Admin = ReturnType<typeof createSupabaseAdminClient>;

const UNIQUE_VIOLATION = "23505";

function buildDeps(admin: Admin): DispatchDeps {
  return {
    async loadSettings(storeId) {
      const { data, error } = await admin
        .from("store_email_settings")
        .select("from_name, from_email, reply_to_email, order_notification_emails, send_order_confirmation, send_shipped, send_cancel_refund, send_store_new_order")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) throw new Error(`e-posta ayarı okunamadı: ${error.message}`);
      return toStoreEmailSettings(data);
    },
    async findLog(target) {
      if (target.kind === "test") return null;
      let query = admin.from("order_email_log").select("id, status, attempts").eq("store_id", target.storeId).eq("kind", target.kind);
      if (target.returnId) query = query.eq("return_id", target.returnId);
      else if (target.orderId) query = query.eq("order_id", target.orderId);
      else return null;
      const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(`e-posta kaydı okunamadı: ${error.message}`);
      return data ? { id: data.id, status: data.status as "sent" | "failed" | "skipped", attempts: data.attempts } : null;
    },
    send: (email) => sendViaResend(email),
    async writeLog(entry) {
      const values = {
        recipient: entry.recipient.slice(0, 1300),
        status: entry.status,
        provider_message_id: entry.providerMessageId,
        error: entry.error,
        attempts: entry.attempts,
      };
      // "sent" olmuş bir kayıt hiçbir zaman failed/skipped'e düşürülmez.
      const updateExisting = async (id: string) => {
        const { error } = await admin.from("order_email_log").update(values).eq("id", id).eq("store_id", entry.storeId).neq("status", "sent");
        if (error) throw new Error(error.message);
      };
      if (entry.existingId) return updateExisting(entry.existingId);

      const { error } = await admin.from("order_email_log").insert({
        store_id: entry.storeId,
        order_id: entry.orderId,
        return_id: entry.returnId,
        kind: entry.kind,
        ...values,
      });
      if (!error) return;
      if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
      // Eşzamanlı ikinci çağrı satırı bizden önce yazdı: var olanı güncelle (sent ise dokunma).
      let query = admin.from("order_email_log").select("id").eq("store_id", entry.storeId).eq("kind", entry.kind);
      query = entry.returnId ? query.eq("return_id", entry.returnId) : query.eq("order_id", entry.orderId ?? "");
      const { data: raced } = await query.limit(1).maybeSingle();
      if (raced) await updateExisting(raced.id);
    },
  };
}

// ---------------------------------------------------------------------------
// Veri yükleme
// ---------------------------------------------------------------------------

interface LoadedStore {
  id: string;
  slug: string;
  customerId: string | null;
  email: EmailStore;
}

/** Logo: mutlak ve kalıcı bir https adresi olmalı (süresi dolan imzalı adres e-postaya konmaz). */
function absoluteLogoUrl(storeSlug: string, profileLogoUrl: string | null, homeUrl: string): string | null {
  if (profileLogoUrl && /^https:\/\//.test(profileLogoUrl) && !/[?&]token=|\/object\/sign\//.test(profileLogoUrl)) return profileLogoUrl;
  const fallback = getStorefrontShowcase(storeSlug)?.brandFallback?.logo ?? null;
  if (!fallback) return null;
  try {
    return new URL(fallback, homeUrl).toString();
  } catch {
    return null;
  }
}

async function loadStore(admin: Admin, storeId: string): Promise<LoadedStore | null> {
  const { data: store } = await admin.from("stores").select("id, name, slug, customer_id").eq("id", storeId).maybeSingle();
  if (!store) return null;
  // Mağazanın kendi alan adı kayıtlı değilse mutlak bağlantı üretilemez; e-posta gönderilmez.
  if (!findStoreSiteBySlug(store.slug)) return null;

  const [{ data: profile }, { data: seller }, { data: documents }] = await Promise.all([
    admin.from("store_profiles").select("logo_url").eq("store_id", storeId).maybeSingle(),
    admin.from("store_seller_profiles").select("legal_name, tax_number, tax_office, mersis_number, address, phone, email").eq("store_id", storeId).maybeSingle(),
    admin.from("store_public_legal_documents").select("kind").eq("store_id", storeId),
  ]);

  const homeUrl = storePageUrl(store.slug, "");
  const published = new Set((documents ?? []).map((row) => row.kind as string));
  const legalLinks = LEGAL_PAGE_LINKS.filter((link) => link.kind !== null && published.has(link.kind)).map((link) => ({
    label: link.label,
    url: storePageUrl(store.slug, link.path),
  }));
  const taxNumber = seller?.tax_number?.replace(/\s+/g, "") ?? "";

  return {
    id: store.id,
    slug: store.slug,
    customerId: store.customer_id,
    email: {
      name: store.name,
      homeUrl,
      logoUrl: absoluteLogoUrl(store.slug, profile?.logo_url ?? null, homeUrl),
      // Mağaza verisinde bugün bir "arka plan rengi" alanı yok (marka ayarında
      // yalnız ana/ikincil/vurgu/hover rengi var); bu yüzden başlık şeridi nötr
      // koyu renkle çıkar. Böyle bir alan eklendiğinde buradan verilir.
      headerBackground: null,
      ordersUrl: storePageUrl(store.slug, "/siparislerim"),
      legalLinks,
      returnsPolicyUrl: published.has("returns") ? storePageUrl(store.slug, "/iade-ve-cayma") : null,
      withdrawalFormUrl: published.has("withdrawal_form") ? storePageUrl(store.slug, "/cayma-formu") : null,
      seller: seller
        ? {
            legalName: seller.legal_name,
            address: seller.address,
            phone: seller.phone,
            email: seller.email,
            // Yalnız 10 haneli VKN yazılır; şahıs işletmesinin 11 haneli TCKN'si e-postaya konmaz.
            taxNumber: /^\d{10}$/.test(taxNumber) ? taxNumber : null,
            taxOffice: /^\d{10}$/.test(taxNumber) ? seller.tax_office : null,
            mersisNumber: seller.mersis_number,
          }
        : null,
    },
  };
}

interface LoadedOrder {
  email: EmailOrder;
  status: string;
  paymentStatus: string;
  customerEmail: string | null;
  customerPhone: string | null;
  note: string | null;
}

const ORDER_COLUMNS =
  "id, store_id, order_number, status, payment_status, payment_method, is_test, created_at, customer_name, customer_phone, customer_email, customer_user_id, address_city, address_district, address_neighborhood, address_line, note, subtotal, discount_amount, discount_code, shipping_fee, cod_fee, carrier, tracking_number, billing_type, billing_name, billing_tax_office, billing_same_as_shipping, billing_address_city, billing_address_district, billing_address_line";

async function loadOrder(admin: Admin, storeId: string, orderId: string): Promise<LoadedOrder | null> {
  const { data: order } = await admin.from("orders").select(ORDER_COLUMNS).eq("id", orderId).eq("store_id", storeId).maybeSingle();
  if (!order) return null;

  const { data: items } = await admin
    .from("order_items")
    .select("id, product_name, variant_label, unit_price, quantity, line_total, created_at")
    .eq("order_id", orderId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });
  const itemIds = (items ?? []).map((item) => item.id);
  const { data: addons } = itemIds.length
    ? await admin.from("order_item_addons").select("order_item_id, addon_name, price_delta").eq("store_id", storeId).in("order_item_id", itemIds)
    : { data: [] as Array<{ order_item_id: string; addon_name: string; price_delta: number }> };

  const subtotal = Number(order.subtotal);
  const discountAmount = Number(order.discount_amount ?? 0);
  const shippingFee = Number(order.shipping_fee ?? 0);
  const codFee = Number(order.cod_fee ?? 0);
  const email = order.customer_email?.trim() || null;
  // Yalnız ödenmemiş Havale/EFT siparişinde ve mağaza bilgiyi girmişse; aksi hâlde null.
  const bankTransfer = await getOrderBankTransferDetails(storeId, { paymentMethod: order.payment_method, paymentStatus: order.payment_status, status: order.status });

  return {
    status: order.status,
    paymentStatus: order.payment_status,
    customerEmail: email,
    customerPhone: order.customer_phone,
    note: order.note,
    email: {
      orderNumber: order.order_number,
      createdAt: order.created_at,
      isTest: order.is_test,
      isGuest: order.customer_user_id === null,
      customerName: order.customer_name,
      items: (items ?? []).map((item) => ({
        name: item.product_name,
        variantLabel: item.variant_label,
        addons: (addons ?? []).filter((addon) => addon.order_item_id === item.id).map((addon) => ({ name: addon.addon_name, priceDelta: Number(addon.price_delta) })),
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
      })),
      subtotal,
      discountAmount,
      discountCode: order.discount_code,
      shippingFee,
      codFee,
      // Siparişte kayıtlı tutarların toplamı (Faz 31: orderGrandTotal); fiyat yeniden hesaplanmaz.
      total: orderGrandTotal(order),
      paymentMethod: order.payment_method,
      address: { neighborhood: order.address_neighborhood, line: order.address_line, district: order.address_district, city: order.address_city },
      billing: {
        type: order.billing_type === "corporate" ? "corporate" : "individual",
        name: order.billing_name,
        taxOffice: order.billing_tax_office,
        sameAsShipping: order.billing_same_as_shipping !== false,
        line: order.billing_address_line,
        district: order.billing_address_district,
        city: order.billing_address_city,
      },
      carrier: order.carrier,
      trackingNumber: order.tracking_number,
      bankTransfer: bankTransfer ? { accountHolder: bankTransfer.accountHolder, bankName: bankTransfer.bankName, iban: formatBankIban(bankTransfer.iban) } : null,
    },
  };
}

async function loadLegalTexts(admin: Admin, storeId: string, orderId: string): Promise<EmailLegalTexts | null> {
  const { data } = await admin
    .from("order_legal_acceptances")
    .select("pre_information_snapshot, distance_sales_snapshot")
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (!data?.pre_information_snapshot || !data.distance_sales_snapshot) return null;
  return { preInformation: data.pre_information_snapshot, distanceSales: data.distance_sales_snapshot };
}

// ---------------------------------------------------------------------------
// Gönderim
// ---------------------------------------------------------------------------

type OrderKind = "order_confirmation" | "store_new_order" | "shipped" | "cancelled";

interface OrderEmailContext {
  admin: Admin;
  store: LoadedStore;
  order: LoadedOrder;
}

async function loadContext(storeId: string, orderId: string): Promise<OrderEmailContext | null> {
  const admin = createSupabaseAdminClient();
  const [store, order] = await Promise.all([loadStore(admin, storeId), loadOrder(admin, storeId, orderId)]);
  return store && order ? { admin, store, order } : null;
}

async function sendOrderKind(context: OrderEmailContext, orderId: string, kind: OrderKind, extra: { returnNumber?: number | null } = {}): Promise<DispatchOutcome> {
  const { admin, store, order } = context;
  return dispatchEmail(buildDeps(admin), {
    storeId: store.id,
    orderId,
    returnId: null,
    kind,
    customerRecipient: kind === "store_new_order" ? null : order.customerEmail,
    async render(): Promise<RenderedEmail | null> {
      switch (kind) {
        case "order_confirmation":
          return renderOrderConfirmation(store.email, order.email, await loadLegalTexts(admin, store.id, orderId));
        case "store_new_order":
          return renderStoreNewOrder(store.email, order.email, {
            adminOrderUrl: store.customerId ? `${getPanelSite().canonicalOrigin}/dashboard/customers/${store.customerId}/stores/${store.id}/orders/${orderId}` : null,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            note: order.note,
          });
        case "shipped":
          return renderShipped(store.email, order.email);
        case "cancelled":
          return renderCancelled(store.email, order.email, { returnNumber: extra.returnNumber ?? null });
      }
    },
  });
}

async function guarded<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    console.error(`[order-emails] ${label} failed:`, error instanceof Error ? error.message : "unknown");
    return null;
  }
}

/**
 * Sipariş "alındı" e-postaları: müşteriye onay + mağazaya bildirim.
 * Kapıda ödeme/havalede sipariş oluşunca, KARTTA yalnız ödeme sunucuda
 * doğrulandıktan sonra çağrılır; koşul burada YENİDEN denetlenir (ödenmemiş
 * kart siparişinde hiçbir şey gönderilmez). Tekrar çağrılması güvenlidir.
 */
export async function notifyOrderPlaced(storeId: string, orderId: string): Promise<void> {
  await guarded("order placed", async () => {
    const context = await loadContext(storeId, orderId);
    if (!context) return;
    const { order } = context;
    if (!canSendOrderPlacedEmails({ paymentMethod: order.email.paymentMethod, paymentStatus: order.paymentStatus, status: order.status }, CARD_PAYMENT_METHOD)) return;
    await sendOrderKind(context, orderId, "order_confirmation");
    await sendOrderKind(context, orderId, "store_new_order");
  });
}

/**
 * Gönderim hiç başlayamadıysa (ör. sipariş verisi okunamadı) bunu kayda
 * "failed" olarak düşer ki panelde görünsün ve "Tekrar gönder" ile
 * denenebilsin. Var olan kayda dokunmaz; kendisi de hata fırlatmaz.
 */
async function recordPreparationFailure(storeId: string, orderId: string, kinds: readonly OrderKind[]): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    for (const kind of kinds) {
      const { data: existing } = await admin.from("order_email_log").select("id").eq("store_id", storeId).eq("order_id", orderId).eq("kind", kind).limit(1).maybeSingle();
      if (existing) continue;
      await admin.from("order_email_log").insert({ store_id: storeId, order_id: orderId, return_id: null, kind, recipient: "-", status: "failed", error: "Gönderim hazırlanamadı.", attempts: 1 });
    }
  } catch {
    // Kayıt da yazılamadı; asıl iş etkilenmez.
  }
}

/**
 * Sipariş "alındı" e-postalarını YANITTAN SONRA gönderir (next/server `after`):
 * müşteri sipariş ekranını e-posta sağlayıcısını beklemeden görür. Çağıran
 * önce siparişi ve sözleşme kaydını yazmış olmalıdır. Koşullar (kartta ödeme
 * doğrulaması), tekrar koruması ve kayıt notifyOrderPlaced ile aynıdır.
 * `after` kullanılamıyorsa gönderim hemen yapılır; hiçbir durumda hata fırlatmaz.
 */
export async function notifyOrderPlacedAfterResponse(storeId: string, orderId: string): Promise<void> {
  await runDeferred(
    after,
    async () => {
      const context = await loadContext(storeId, orderId);
      if (!context) return;
      const { order } = context;
      if (!canSendOrderPlacedEmails({ paymentMethod: order.email.paymentMethod, paymentStatus: order.paymentStatus, status: order.status }, CARD_PAYMENT_METHOD)) return;
      await sendOrderKind(context, orderId, "order_confirmation");
      await sendOrderKind(context, orderId, "store_new_order");
    },
    async (error) => {
      console.error("[order-emails] deferred order placed failed:", error instanceof Error ? error.message : "unknown");
      await recordPreparationFailure(storeId, orderId, ["order_confirmation", "store_new_order"]);
    },
  );
}

/** Kargo e-postası: sipariş "shipped" ve takip numarası yazılmışsa; bir kez. Koşul tutmuyorsa hiçbir şey yapmaz. */
export async function notifyOrderShipped(storeId: string, orderIds: string | readonly string[]): Promise<void> {
  for (const orderId of typeof orderIds === "string" ? [orderIds] : orderIds) {
    await guarded("order shipped", async () => {
      const context = await loadContext(storeId, orderId);
      if (!context || !canSendShippedEmail({ status: context.order.status, trackingNumber: context.order.email.trackingNumber })) return;
      await sendOrderKind(context, orderId, "shipped");
    });
  }
}

/** İptal e-postası: sipariş "cancelled" durumundaysa; bir kez. */
export async function notifyOrderCancelled(storeId: string, orderIds: string | readonly string[], extra: { returnNumber?: number | null } = {}): Promise<void> {
  for (const orderId of typeof orderIds === "string" ? [orderIds] : orderIds) {
    await guarded("order cancelled", async () => {
      const context = await loadContext(storeId, orderId);
      if (!context || context.order.status !== "cancelled") return;
      await sendOrderKind(context, orderId, "cancelled", extra);
    });
  }
}

/** Sipariş durumu değişince: yeni duruma göre ilgili e-posta (varsa). */
export async function notifyOrderStatusChanged(storeId: string, orderIds: readonly string[], status: string): Promise<void> {
  if (status === "shipped") await notifyOrderShipped(storeId, orderIds);
  else if (status === "cancelled") await notifyOrderCancelled(storeId, orderIds);
}

const RETURN_EVENT_KIND: Record<ReturnEmailEvent, EmailKind> = {
  requested: "return_requested",
  approved: "return_approved",
  rejected: "return_rejected",
  refunded: "refund_completed",
};

/**
 * İptal/iade talebi e-postaları (Faz 30). İptal talebinin ONAYI ayrı bir
 * "talep onaylandı" e-postası olarak değil, siparişin iptal e-postası olarak
 * gider (müşteri aynı olay için iki e-posta almaz).
 */
export async function notifyReturnEvent(params: {
  storeId: string;
  orderId: string;
  returnId: string;
  event: ReturnEmailEvent;
  refundAmount?: number | null;
}): Promise<void> {
  await guarded("return event", async () => {
    const context = await loadContext(params.storeId, params.orderId);
    if (!context) return;
    const { admin, store, order } = context;
    const { data: record } = await admin
      .from("order_returns")
      .select("id, order_id, return_number, kind, return_code, return_carrier_name, return_instructions_snapshot, rejection_reason, refund_amount")
      .eq("id", params.returnId)
      .eq("store_id", params.storeId)
      .maybeSingle();
    if (!record || record.order_id !== params.orderId) return;

    if (record.kind === "cancel" && params.event === "approved") {
      if (order.status === "cancelled") await sendOrderKind(context, params.orderId, "cancelled", { returnNumber: record.return_number });
      return;
    }

    await dispatchEmail(buildDeps(admin), {
      storeId: store.id,
      orderId: params.orderId,
      returnId: record.id,
      kind: RETURN_EVENT_KIND[params.event],
      customerRecipient: order.customerEmail,
      render: () =>
        renderReturnEmail(
          store.email,
          { orderNumber: order.email.orderNumber, isTest: order.email.isTest, customerName: order.email.customerName },
          {
            event: params.event,
            requestKind: record.kind === "cancel" ? "cancel" : "return",
            returnNumber: record.return_number,
            refundAmount: params.refundAmount ?? (record.refund_amount === null ? null : Number(record.refund_amount)),
            returnCode: record.return_code,
            carrierName: record.return_carrier_name,
            instructions: record.return_instructions_snapshot,
            rejectionReason: record.rejection_reason,
          },
        ),
    });
  });
}

export type ResendOutcome = DispatchOutcome | { status: "not_allowed" };

/**
 * Admin "Tekrar gönder": yalnız gönderilememiş (failed) ya da atlanmış
 * (skipped) bir kaydı yeniden dener. Gönderilmiş e-posta yeniden gönderilmez.
 * Onay/bildirim için kart-ödeme koşulu, kargo/iptal için durum koşulu yine geçerlidir.
 */
export async function resendLoggedEmail(storeId: string, logId: string): Promise<ResendOutcome> {
  const outcome = await guarded<ResendOutcome>("resend", async () => {
    const admin = createSupabaseAdminClient();
    const { data: log } = await admin.from("order_email_log").select("id, order_id, return_id, kind, status").eq("id", logId).eq("store_id", storeId).maybeSingle();
    if (!log || log.status === "sent" || !log.order_id) return { status: "not_allowed" };
    const kind = log.kind as EmailKind;

    if ((RETURN_KINDS as readonly string[]).includes(kind) && log.return_id) {
      const event = (Object.keys(RETURN_EVENT_KIND) as ReturnEmailEvent[]).find((key) => RETURN_EVENT_KIND[key] === kind);
      if (!event) return { status: "not_allowed" };
      await notifyReturnEvent({ storeId, orderId: log.order_id, returnId: log.return_id, event });
    } else if ((ONE_OFF_ORDER_KINDS as readonly string[]).includes(kind)) {
      const context = await loadContext(storeId, log.order_id);
      if (!context) return { status: "not_allowed" };
      const { order } = context;
      const placed = canSendOrderPlacedEmails({ paymentMethod: order.email.paymentMethod, paymentStatus: order.paymentStatus, status: order.status }, CARD_PAYMENT_METHOD);
      if ((kind === "order_confirmation" || kind === "store_new_order") && !placed) return { status: "not_allowed" };
      if (kind === "shipped" && !canSendShippedEmail({ status: order.status, trackingNumber: order.email.trackingNumber })) return { status: "not_allowed" };
      if (kind === "cancelled" && order.status !== "cancelled") return { status: "not_allowed" };
      return sendOrderKind(context, log.order_id, kind as OrderKind);
    } else {
      return { status: "not_allowed" };
    }

    const { data: after } = await admin.from("order_email_log").select("status, error, provider_message_id").eq("id", logId).eq("store_id", storeId).maybeSingle();
    if (after?.status === "sent") return { status: "sent", messageId: after.provider_message_id };
    return { status: "failed", error: after?.error ?? "Gönderilemedi." };
  });
  return outcome ?? { status: "failed", error: "Gönderilemedi." };
}

/** Admin "Bana test e-postası gönder": mağazanın kayıtlı ayarıyla, oturumdaki kullanıcının adresine. */
export async function sendStoreTestEmail(storeId: string, recipient: string): Promise<DispatchOutcome> {
  const outcome = await guarded("test email", async () => {
    const admin = createSupabaseAdminClient();
    const store = await loadStore(admin, storeId);
    const target: EmailLogTarget = { storeId, orderId: null, returnId: null, kind: "test" };
    return dispatchEmail(buildDeps(admin), {
      ...target,
      customerRecipient: recipient,
      nonce: `test-${storeId}-${Date.now()}`,
      render: (settings: StoreEmailSettings) => (store ? renderTestEmail(store.email, { fromName: settings.fromName, fromEmail: settings.fromEmail }) : null),
    });
  });
  return outcome ?? { status: "failed", error: "Gönderilemedi." };
}

export interface EmailLogRow {
  id: string;
  orderId: string | null;
  kind: EmailKind;
  recipient: string;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}
