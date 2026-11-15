import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { OrderReturnKind, OrderReturnReason, OrderReturnStatus, OrderStatus, PaymentStatus } from "@/lib/supabase/types";
import { computeFinalRefund, type RefundLineInput } from "@/lib/commerce/returns/amounts";
import { canRequestCancel, canRequestReturn, isLinePersonalized, refundMethodFor } from "@/lib/commerce/returns/eligibility";
import { isValidTrIban, normalizeIban } from "@/lib/commerce/returns/iban";
import { canTransition } from "@/lib/commerce/returns/state";

/**
 * Faz 30 — iptal/iade talepleri: sunucu tarafı TEK giriş noktası.
 *
 * Tüm okuma/yazma service-role ile ve HER sorguda store_id filtresiyle
 * (Faz 29 deseni). Çağıran, sipariş sahipliğini ÖNCE doğrulamalı:
 *  - üye: siparişin customer_user_id'si oturumdaki kullanıcı,
 *  - misafir: sipariş no + telefon sorgusundan sonra üretilen imzalı jeton
 *    (lib/commerce/returns/guest-token.ts).
 * Tutarlar sunucuda hesaplanır; uygunluk kuralları her talepte yeniden
 * çalıştırılır; IBAN log'a/audit'e asla yazılmaz.
 */

export interface ReturnSettings {
  returnsEnabled: boolean;
  returnWindowDays: number;
  carrierName: string | null;
  returnCode: string | null;
  instructions: string | null;
  address: string | null;
}

export async function getReturnSettings(storeId: string): Promise<ReturnSettings> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("store_return_settings").select("*").eq("store_id", storeId).maybeSingle();
  return {
    returnsEnabled: data?.returns_enabled ?? false,
    returnWindowDays: data?.return_window_days ?? 14,
    carrierName: data?.return_carrier_name ?? null,
    returnCode: data?.return_code ?? null,
    instructions: data?.return_instructions ?? null,
    address: data?.return_address ?? null,
  };
}

export interface ReturnOrderLine {
  id: string;
  productName: string;
  variantLabel: string | null;
  addonLabels: string[];
  quantity: number;
  lineTotal: number;
  personalized: boolean;
  returnedQuantity: number;
}

export interface ReturnRecord {
  id: string;
  returnNumber: number;
  kind: OrderReturnKind;
  status: OrderReturnStatus;
  reason: OrderReturnReason;
  customerNote: string | null;
  refundMethod: string | null;
  refundAmount: number;
  refundedAt: string | null;
  returnCode: string | null;
  returnCarrierName: string | null;
  returnInstructions: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  handedToCarrierAt: string | null;
  receivedAt: string | null;
  items: Array<{ orderItemId: string; quantity: number; refundAmount: number }>;
}

export interface ReturnOrderContext {
  storeId: string;
  customerId: string;
  order: {
    id: string;
    orderNumber: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: string | null;
    paymentProviderPaymentId: string | null;
    customerUserId: string | null;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string;
    subtotal: number;
    discountAmount: number;
    trackingNumber: string | null;
    carrier: string | null;
    shippingProviderOrderId: string | null;
    createdAt: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  lines: ReturnOrderLine[];
  returns: ReturnRecord[];
  alreadyRefunded: number;
}

const COUNTS_AS_RETURNED: OrderReturnStatus[] = ["requested", "approved", "received", "refunded", "closed"];

export async function loadReturnOrderContext(storeId: string, orderId: string): Promise<ReturnOrderContext | null> {
  const admin = createSupabaseAdminClient();
  const [{ data: order }, { data: store }] = await Promise.all([
    admin
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_method, payment_provider_payment_id, customer_user_id, customer_name, customer_email, customer_phone, subtotal, discount_amount, tracking_number, carrier, shipping_provider_order_id, created_at, shipped_at, delivered_at",
      )
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle(),
    admin.from("stores").select("customer_id").eq("id", storeId).maybeSingle(),
  ]);
  if (!order || !store) return null;

  const [{ data: items }, { data: returns }] = await Promise.all([
    admin
      .from("order_items")
      .select("id, product_id, product_name, variant_label, quantity, line_total")
      .eq("order_id", orderId)
      .eq("store_id", storeId)
      .order("created_at", { ascending: true }),
    admin
      .from("order_returns")
      .select("*")
      .eq("order_id", orderId)
      .eq("store_id", storeId)
      .order("requested_at", { ascending: false }),
  ]);

  const itemIds = (items ?? []).map((item) => item.id);
  const returnIds = (returns ?? []).map((r) => r.id);
  const productIds = [...new Set((items ?? []).map((item) => item.product_id).filter((id): id is string => Boolean(id)))];

  const [{ data: addons }, { data: products }, { data: returnItems }] = await Promise.all([
    itemIds.length
      ? admin.from("order_item_addons").select("order_item_id, addon_id, addon_name").eq("store_id", storeId).in("order_item_id", itemIds)
      : Promise.resolve({ data: [] as Array<{ order_item_id: string; addon_id: string | null; addon_name: string }> }),
    productIds.length
      ? admin.from("products").select("id, is_personalized_non_returnable").eq("store_id", storeId).in("id", productIds)
      : Promise.resolve({ data: [] as Array<{ id: string; is_personalized_non_returnable: boolean }> }),
    returnIds.length
      ? admin.from("order_return_items").select("return_id, order_item_id, quantity, refund_amount").eq("store_id", storeId).in("return_id", returnIds)
      : Promise.resolve({ data: [] as Array<{ return_id: string; order_item_id: string; quantity: number; refund_amount: number }> }),
  ]);

  const addonIds = [...new Set((addons ?? []).map((a) => a.addon_id).filter((id): id is string => Boolean(id)))];
  const { data: addonFlags } = addonIds.length
    ? await admin.from("product_addons").select("id, is_personalized_non_returnable").eq("store_id", storeId).in("id", addonIds)
    : { data: [] as Array<{ id: string; is_personalized_non_returnable: boolean }> };

  const productFlag = new Map((products ?? []).map((p) => [p.id, p.is_personalized_non_returnable]));
  const addonFlag = new Map((addonFlags ?? []).map((a) => [a.id, a.is_personalized_non_returnable]));
  const returnStatus = new Map((returns ?? []).map((r) => [r.id, r.status as OrderReturnStatus]));

  const returnedByItem = new Map<string, number>();
  for (const ri of returnItems ?? []) {
    const status = returnStatus.get(ri.return_id);
    if (status && COUNTS_AS_RETURNED.includes(status)) {
      returnedByItem.set(ri.order_item_id, (returnedByItem.get(ri.order_item_id) ?? 0) + ri.quantity);
    }
  }

  const lines: ReturnOrderLine[] = (items ?? []).map((item) => {
    const itemAddons = (addons ?? []).filter((a) => a.order_item_id === item.id);
    return {
      id: item.id,
      productName: item.product_name,
      variantLabel: item.variant_label,
      addonLabels: itemAddons.map((a) => a.addon_name),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
      personalized: isLinePersonalized(
        item.product_id ? productFlag.get(item.product_id) : false,
        itemAddons.map((a) => (a.addon_id ? addonFlag.get(a.addon_id) : false)),
      ),
      returnedQuantity: returnedByItem.get(item.id) ?? 0,
    };
  });

  const records: ReturnRecord[] = (returns ?? []).map((r) => ({
    id: r.id,
    returnNumber: r.return_number,
    kind: r.kind,
    status: r.status,
    reason: r.reason,
    customerNote: r.customer_note,
    refundMethod: r.refund_method,
    refundAmount: Number(r.refund_amount),
    refundedAt: r.refunded_at,
    returnCode: r.return_code,
    returnCarrierName: r.return_carrier_name,
    returnInstructions: r.return_instructions_snapshot,
    rejectionReason: r.rejection_reason,
    requestedAt: r.requested_at,
    decidedAt: r.decided_at,
    handedToCarrierAt: r.handed_to_carrier_at,
    receivedAt: r.received_at,
    items: (returnItems ?? [])
      .filter((ri) => ri.return_id === r.id)
      .map((ri) => ({ orderItemId: ri.order_item_id, quantity: ri.quantity, refundAmount: Number(ri.refund_amount) })),
  }));

  return {
    storeId,
    customerId: store.customer_id,
    order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      paymentProviderPaymentId: order.payment_provider_payment_id,
      customerUserId: order.customer_user_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discount_amount ?? 0),
      trackingNumber: order.tracking_number,
      carrier: order.carrier,
      shippingProviderOrderId: order.shipping_provider_order_id,
      createdAt: order.created_at,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
    },
    lines,
    returns: records,
    alreadyRefunded: records.filter((r) => r.status === "refunded").reduce((sum, r) => sum + r.refundAmount, 0),
  };
}

export function eligibilityFor(context: ReturnOrderContext, settings: ReturnSettings) {
  const existing = context.returns.map((r) => r.status);
  const orderForRules = {
    status: context.order.status,
    paymentStatus: context.order.paymentStatus,
    trackingNumber: context.order.trackingNumber,
    deliveredAt: context.order.deliveredAt,
  };
  const ruleSettings = { returnsEnabled: settings.returnsEnabled, returnWindowDays: settings.returnWindowDays };
  return {
    cancel: canRequestCancel(orderForRules, ruleSettings, existing),
    return: canRequestReturn(orderForRules, ruleSettings, existing),
    refundMethod: {
      cancel: refundMethodFor("cancel", context.order),
      return: refundMethodFor("return", context.order),
    },
  };
}

/** Misafir jetonu anahtarı: service-role anahtarından türetilir (yeni env gerekmez; sızarsa zaten her şey açıktır). */
export function guestReturnTokenKey(): string {
  const base = serverEnv.supabaseServiceRoleKey ?? "";
  return base ? createHash("sha256").update(`mb-order-return-token:${base}`).digest("hex") : "";
}

export interface CreateReturnInput {
  context: ReturnOrderContext;
  settings: ReturnSettings;
  kind: OrderReturnKind;
  channel: "member" | "guest";
  actorUserId: string | null;
  reason: OrderReturnReason;
  customerNote: string | null;
  /** İade: orderItemId → adet. İptal: yok sayılır (tüm sipariş). */
  quantities: Record<string, number>;
  iban: string | null;
  accountHolder: string | null;
}

export type CreateReturnResult = { ok: true; id: string; returnNumber: number } | { ok: false; error: string };

export async function createReturnRequest(input: CreateReturnInput): Promise<CreateReturnResult> {
  const { context, settings, kind } = input;
  const eligibility = eligibilityFor(context, settings);
  const rule = kind === "cancel" ? eligibility.cancel : eligibility.return;
  if (!rule.allowed) return { ok: false, error: rule.reason };

  // Kalemler: iptal = kalan her şey; iade = seçilenler (kişiye özel seçilemez).
  const selected: RefundLineInput[] = [];
  for (const line of context.lines) {
    const remaining = line.quantity - line.returnedQuantity;
    if (remaining <= 0) continue;
    const quantity = kind === "cancel" ? remaining : Math.floor(Number(input.quantities[line.id] ?? 0));
    if (!quantity) continue;
    if (quantity < 0 || quantity > remaining) return { ok: false, error: "Geçersiz adet seçimi." };
    if (kind === "return" && line.personalized) {
      return { ok: false, error: `"${line.productName}" kişiye özel hazırlandığı için cayma kapsamı dışında.` };
    }
    selected.push({ orderItemId: line.id, lineTotal: line.lineTotal, quantity: line.quantity, returnQuantity: quantity, previouslyReturnedQuantity: line.returnedQuantity });
  }
  if (selected.length === 0) return { ok: false, error: kind === "cancel" ? "İptal edilecek kalem kalmadı." : "İade etmek istediğiniz ürünü ve adedi seçin." };

  const allCovered = context.lines.every((line) => {
    const pick = selected.find((s) => s.orderItemId === line.id);
    return line.returnedQuantity + (pick?.returnQuantity ?? 0) >= line.quantity;
  });

  const refundMethod = kind === "cancel" ? eligibility.refundMethod.cancel : eligibility.refundMethod.return;
  const amounts = computeFinalRefund(
    { subtotal: context.order.subtotal, discountAmount: context.order.discountAmount, alreadyRefunded: context.alreadyRefunded },
    selected,
    allCovered,
  );
  const refundAmount = refundMethod === "none" ? 0 : amounts.total;

  let iban: string | null = null;
  if (refundMethod === "iban" && refundAmount > 0) {
    iban = normalizeIban(input.iban ?? "");
    if (!isValidTrIban(iban)) return { ok: false, error: "Geçerli bir TR IBAN girin (TR ile başlayan 26 karakter)." };
    const holder = (input.accountHolder ?? "").trim();
    if (holder.length < 3) return { ok: false, error: "Hesap sahibinin adını ve soyadını girin." };
  }

  const admin = createSupabaseAdminClient();
  const { data: created, error } = await admin
    .from("order_returns")
    .insert({
      store_id: context.storeId,
      order_id: context.order.id,
      kind,
      reason: input.reason,
      customer_note: input.customerNote?.trim().slice(0, 1000) || null,
      channel: input.channel,
      refund_method: refundMethod,
      refund_amount: refundAmount,
      restock: false,
    })
    .select("id, return_number")
    .single();

  if (error || !created) {
    if (error?.code === "23505") return { ok: false, error: "Bu sipariş için açık bir talebiniz var." };
    console.error("[returns] create failed:", error?.message);
    return { ok: false, error: "Talebiniz kaydedilemedi, lütfen tekrar deneyin." };
  }

  const { error: itemsError } = await admin.from("order_return_items").insert(
    amounts.lines.map((line) => ({
      store_id: context.storeId,
      return_id: created.id,
      order_item_id: line.orderItemId,
      quantity: selected.find((s) => s.orderItemId === line.orderItemId)?.returnQuantity ?? 0,
      refund_amount: refundMethod === "none" ? 0 : line.refund,
    })),
  );
  if (itemsError) {
    console.error("[returns] items insert failed:", itemsError.message);
    await admin.from("order_returns").delete().eq("id", created.id).eq("store_id", context.storeId);
    return { ok: false, error: "Talebiniz kaydedilemedi, lütfen tekrar deneyin." };
  }

  if (iban) {
    const { error: bankError } = await admin.from("order_return_bank_details").insert({
      return_id: created.id,
      store_id: context.storeId,
      account_holder: (input.accountHolder ?? "").trim().slice(0, 140),
      iban,
    });
    if (bankError) {
      console.error("[returns] bank details insert failed:", bankError.message);
      await admin.from("order_returns").delete().eq("id", created.id).eq("store_id", context.storeId);
      return { ok: false, error: "Talebiniz kaydedilemedi, lütfen tekrar deneyin." };
    }
  }

  await logAuditEvent({
    userId: input.actorUserId,
    customerId: context.customerId,
    action: "order_return.request",
    entityType: "order_return",
    entityId: created.id,
    metadata: {
      storeId: context.storeId,
      orderNumber: context.order.orderNumber,
      returnNumber: created.return_number,
      kind,
      channel: input.channel,
      refundMethod,
      refundAmount,
    },
  });

  return { ok: true, id: created.id, returnNumber: created.return_number };
}

/** Müşteri: "Kargoya teslim ettim" (yasal 14 günlük ödeme sayacı başlar). Yalnız onaylanmış iade. */
export async function customerMarkHandedToCarrier(context: ReturnOrderContext, returnId: string, actorUserId: string | null): Promise<boolean> {
  const record = context.returns.find((r) => r.id === returnId);
  if (!record || record.kind !== "return" || record.status !== "approved" || record.handedToCarrierAt) return false;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("order_returns")
    .update({ handed_to_carrier_at: new Date().toISOString() })
    .eq("id", returnId)
    .eq("store_id", context.storeId)
    .eq("order_id", context.order.id)
    .eq("status", "approved")
    .is("handed_to_carrier_at", null)
    .select("id");
  if (error || !data?.length) return false;
  await logAuditEvent({
    userId: actorUserId,
    customerId: context.customerId,
    action: "order_return.handed_to_carrier",
    entityType: "order_return",
    entityId: returnId,
    metadata: { storeId: context.storeId, orderNumber: context.order.orderNumber },
  });
  return true;
}

/** Müşteri: talebi geri çek (yalnız "talep alındı" ya da kargoya verilmemiş onaylı iade). */
export async function customerWithdrawRequest(context: ReturnOrderContext, returnId: string, actorUserId: string | null): Promise<boolean> {
  const record = context.returns.find((r) => r.id === returnId);
  if (!record || !canTransition(record.kind, record.status, "cancelled_by_customer") || record.handedToCarrierAt) return false;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("order_returns")
    .update({ status: "cancelled_by_customer", decided_at: new Date().toISOString() })
    .eq("id", returnId)
    .eq("store_id", context.storeId)
    .eq("order_id", context.order.id)
    .eq("status", record.status)
    .select("id");
  if (error || !data?.length) return false;
  await admin.from("order_return_bank_details").delete().eq("return_id", returnId).eq("store_id", context.storeId);
  await logAuditEvent({
    userId: actorUserId,
    customerId: context.customerId,
    action: "order_return.withdraw",
    entityType: "order_return",
    entityId: returnId,
    metadata: { storeId: context.storeId, orderNumber: context.order.orderNumber },
  });
  return true;
}
