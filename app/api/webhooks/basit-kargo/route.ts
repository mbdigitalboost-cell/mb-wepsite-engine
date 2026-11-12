import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { findStoreByShippingWebhookSecret, touchShippingWebhook } from "@/lib/integrations/store-shipping-integration";
import type { OrderStatus } from "@/lib/supabase/types";

/**
 * Basit Kargo "Durum Değişikliği" webhook'u (Faz 20'de yazıldı, Faz 21'de
 * mağaza bazlı secret'a geçti). Basit Kargo panelinde (Ayarlar → Webhook)
 * admin sayfasının gösterdiği TAM URL (…/api/webhooks/basit-kargo?secret=…)
 * tanımlanır; kargo ana durumu değiştiğinde Basit Kargo buraya POST atar:
 *   { id, orderNumber, orderId, barcode, status, handler:{name,code},
 *     handlerShipmentCode }
 *
 * GÜVENLİK (Faz 21): secret ZORUNLU — `?secret=` query param'ı veya
 * `x-webhook-secret` başlığı. store_shipping_integrations.webhook_secret
 * (UNIQUE) üzerinden mağaza çözülür; eşleşme yoksa 401. Güncelleme
 * YALNIZCA o mağazanın siparişleriyle sınırlı (.eq store_id). Basit Kargo
 * dokümanında imza/HMAC başlığı yok, bu yüzden secret-URL tek yöntem.
 *
 * Eşleme: önce `tracking_number = barcode` (Kargoya Hazırla barkodu oraya
 * yazar), yoksa `shipping_provider_order_id = id` (otomatik gönderilmiş,
 * henüz barkodsuz sipariş için de durum olayı gelebilir).
 *   SHIPPED, OUT_FOR_DELIVERY → shipped
 *   DELIVERED                 → completed
 *   NEW, READY_TO_SHIP        → durum değişmez
 *   NEEDS_SUPPORT, DELAYED, RETURNING, RETURNED, LOST → durum DEĞİŞMEZ,
 *     `note`'a "[Kargo uyarısı: X]" satırı (idempotent, durum başına bir kez)
 * Durum sadece İLERİ yönde değişir, cancelled'a dokunulmaz — aynı webhook
 * tekrar gelirse ikinci bir etki yaratmaz.
 */

export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-webhook-secret";
const WEBHOOK_RATE_LIMIT = { limit: 120, windowMs: 60 * 1000 };

const STATUS_MAP: Record<string, OrderStatus> = {
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "shipped",
  DELIVERED: "completed",
};

const ALERT_STATUSES = new Set(["NEEDS_SUPPORT", "DELAYED", "RETURNING", "RETURNED", "LOST"]);

const STATUS_RANK: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  shipped: 3,
  completed: 4,
  cancelled: -1,
};

interface WebhookPayload {
  providerOrderId: string | null;
  barcode: string | null;
  status: string;
  handlerName: string | null;
  handlerShipmentCode: string | null;
}

function readString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

function parsePayload(body: unknown): WebhookPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const status = readString(record.status, 40)?.toUpperCase() ?? null;
  const barcode = readString(record.barcode, 100);
  const providerOrderId = readString(record.id, 100);
  if (!status || (!barcode && !providerOrderId)) return null;

  const handler = record.handler && typeof record.handler === "object" ? (record.handler as Record<string, unknown>) : null;
  return {
    providerOrderId,
    barcode,
    status,
    handlerName: handler ? readString(handler.name, 100) : null,
    handlerShipmentCode: readString(record.handlerShipmentCode, 100),
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request);
  const limit = rateLimit(`basit-kargo-webhook:${ip}`, WEBHOOK_RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: limit.retryAfterMs ? { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } : undefined },
    );
  }

  const provided = request.headers.get(SECRET_HEADER) ?? new URL(request.url).searchParams.get("secret") ?? "";
  const store = await findStoreByShippingWebhookSecret(provided);
  if (!store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await touchShippingWebhook(store.storeId);

  const admin = createSupabaseAdminClient();
  const selectColumns = "id, store_id, order_number, status, note, carrier, tracking_number, shipping_provider_order_id";

  let order: {
    id: string;
    store_id: string;
    order_number: number;
    status: string;
    note: string | null;
    carrier: string | null;
    tracking_number: string | null;
    shipping_provider_order_id: string | null;
  } | null = null;

  if (payload.barcode) {
    const { data } = await admin
      .from("orders")
      .select(selectColumns)
      .eq("store_id", store.storeId)
      .eq("tracking_number", payload.barcode)
      .limit(1)
      .maybeSingle();
    order = data;
  }
  if (!order && payload.providerOrderId) {
    const { data } = await admin
      .from("orders")
      .select(selectColumns)
      .eq("store_id", store.storeId)
      .eq("shipping_provider_order_id", payload.providerOrderId)
      .limit(1)
      .maybeSingle();
    order = data;
  }

  if (!order) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const currentStatus = order.status as OrderStatus;
  const update: {
    status?: OrderStatus;
    note?: string;
    carrier?: string;
    tracking_number?: string;
    shipping_provider_order_id?: string;
  } = {};

  const mappedStatus = STATUS_MAP[payload.status];
  if (mappedStatus && currentStatus !== "cancelled" && STATUS_RANK[mappedStatus] > STATUS_RANK[currentStatus]) {
    update.status = mappedStatus;
  }

  if (ALERT_STATUSES.has(payload.status)) {
    const marker = `[Kargo uyarısı: ${payload.status}]`;
    if (!(order.note ?? "").includes(marker)) {
      const line = `${marker} ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`;
      update.note = order.note ? `${order.note}\n${line}` : line;
    }
  }

  if (payload.handlerName && payload.handlerName !== order.carrier) update.carrier = payload.handlerName;
  if (payload.barcode && !order.tracking_number) update.tracking_number = payload.barcode;
  if (payload.providerOrderId && !order.shipping_provider_order_id) update.shipping_provider_order_id = payload.providerOrderId;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, updated: false });
  }

  const { error: updateError } = await admin.from("orders").update(update).eq("id", order.id).eq("store_id", store.storeId);
  if (updateError) {
    console.error("[basit-kargo webhook] order update failed:", updateError.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const { data: storeRow } = await admin.from("stores").select("customer_id").eq("id", store.storeId).maybeSingle();
  if (storeRow?.customer_id) {
    const ordersPath = `/dashboard/customers/${storeRow.customer_id}/stores/${store.storeId}/orders`;
    revalidatePath(ordersPath);
    revalidatePath(`${ordersPath}/${order.id}`);

    await logAuditEvent({
      userId: null,
      customerId: storeRow.customer_id,
      action: "order.shipment_webhook",
      entityType: "order",
      entityId: order.id,
      metadata: { providerStatus: payload.status, applied: Object.keys(update) },
    });
  }

  return NextResponse.json({ ok: true, updated: true, orderNumber: order.order_number, applied: Object.keys(update) });
}
