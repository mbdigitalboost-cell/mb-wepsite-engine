import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { cancelOrder, createOrder, type ShippableOrder } from "@/lib/integrations/basit-kargo";
import { getShippingIntegrationSecrets } from "@/lib/integrations/store-shipping-integration";
import { summarizeOrderItems } from "@/lib/commerce/order-item-summary";

/** Faz 25 — sipariş id → "Ürün (Renk) ×N, …" özeti (tek sorgu). Basit Kargo içerik adı için. */
export async function loadOrderContentSummaries(storeId: string, orderIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (orderIds.length === 0) return result;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("order_items")
    .select("order_id, product_name, variant_label, quantity, created_at")
    .in("order_id", orderIds)
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });
  const byOrder = new Map<string, { product_name: string; variant_label: string | null; quantity: number }[]>();
  for (const row of data ?? []) byOrder.set(row.order_id, [...(byOrder.get(row.order_id) ?? []), row]);
  for (const [orderId, items] of byOrder) result.set(orderId, summarizeOrderItems(items));
  return result;
}

/**
 * Faz 21 — "Siparişler onaylanınca otomatik Basit Kargo'ya düşsün"
 * (barkodsuz; firma + barkod sonra "Kargoya Hazırla" ile).
 *
 * Çağıran taraf (orders/actions.ts) siparişin durumunu ZATEN güncellemiş
 * olur; bu fonksiyon yalnızca yan etki. HATA DURUMU DURUM DEĞİŞİKLİĞİNİ
 * ENGELLEMEZ: sipariş yine onaylanır, shipping_sync_status='failed' +
 * shipping_sync_error yazılır, admin "Tekrar Gönder" ile yeniden dener.
 *
 * Geriye dönük gönderim yok: sadece çağıranın verdiği (o an geçiş yapan)
 * sipariş id'leri işlenir; ayrıca yalnızca status confirmed/preparing VE
 * shipping_provider_order_id BOŞ olanlar gönderilir — Basit Kargo'da zaten
 * kaydı olan sipariş ikinci kez açılmaz.
 *
 * Yazmalar service-role ile: bu kolonlar sistem alanı, RLS'in editor-tier
 * update policy'si yine de kapsıyor ama admin client aynı zamanda
 * entegrasyon kaydını (RLS'siz tablo) okumak için zaten gerekli.
 */

export interface ShippingPushFailure {
  orderId: string;
  orderNumber: number;
  message: string;
}

export interface ShippingPushResult {
  /** Entegrasyon yok / token yok / pasif / otomatik gönderim kapalı — hiçbir çağrı yapılmadı. */
  skippedReason: "not_configured" | "auto_push_disabled" | null;
  pushed: string[];
  failed: ShippingPushFailure[];
}

const PUSHABLE_STATUSES = ["confirmed", "preparing"] as const;

export async function pushOrdersToShippingProvider(params: {
  storeId: string;
  customerId: string;
  actorUserId: string | null;
  orderIds: string[];
  /** "Tekrar Gönder": auto_push_on_confirm kapalı olsa da gönderir (admin açıkça istedi). */
  force?: boolean;
}): Promise<ShippingPushResult> {
  const { storeId, customerId, actorUserId, orderIds, force = false } = params;
  const result: ShippingPushResult = { skippedReason: null, pushed: [], failed: [] };
  if (orderIds.length === 0) return result;

  const integration = await getShippingIntegrationSecrets(storeId);
  if (!integration || !integration.apiToken || !integration.isActive) {
    result.skippedReason = "not_configured";
    return result;
  }
  if (!force && !integration.autoPushOnConfirm) {
    result.skippedReason = "auto_push_disabled";
    return result;
  }

  const admin = createSupabaseAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, customer_email, address_city, address_district, address_neighborhood, address_line, subtotal, discount_amount, shipping_fee, cod_fee, payment_method, payment_status",
    )
    .in("id", orderIds)
    .eq("store_id", storeId)
    .in("status", [...PUSHABLE_STATUSES])
    .is("shipping_provider_order_id", null);

  const summaries = await loadOrderContentSummaries(storeId, (orders ?? []).map((o) => o.id));
  for (const order of (orders ?? []) as ShippableOrder[]) {
    order.content_summary = summaries.get(order.id) ?? null;
    try {
      const { basitKargoOrderId } = await createOrder(integration.apiToken, order, integration.defaultDesi);
      const { error } = await admin
        .from("orders")
        .update({ shipping_provider_order_id: basitKargoOrderId, shipping_sync_status: "sent", shipping_sync_error: null })
        .eq("id", order.id)
        .eq("store_id", storeId);
      if (error) {
        result.failed.push({ orderId: order.id, orderNumber: order.order_number, message: `Basit Kargo'da oluştu (${basitKargoOrderId}) ama kaydedilemedi: ${error.message}` });
        continue;
      }
      result.pushed.push(order.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      await admin
        .from("orders")
        .update({ shipping_sync_status: "failed", shipping_sync_error: message.slice(0, 500) })
        .eq("id", order.id)
        .eq("store_id", storeId);
      result.failed.push({ orderId: order.id, orderNumber: order.order_number, message });
    }
  }

  if (result.pushed.length > 0 || result.failed.length > 0) {
    await logAuditEvent({
      userId: actorUserId,
      customerId,
      action: "order.shipment_push",
      entityType: "order",
      entityId: null,
      metadata: { pushedOrderIds: result.pushed, failedCount: result.failed.length, force },
    });
  }

  return result;
}

/**
 * İptal: Basit Kargo'ya düşmüş ama BARKODU OLMAYAN (tracking_number boş)
 * sipariş cancelled olursa Basit Kargo'da da silinir (DELETE /order/{id},
 * doküman "Sipariş Sil"). Barkodu üretilmiş sipariş BİLEREK dokunulmaz —
 * kargo zaten fiziksel akışa girmiş olabilir, iptali admin Basit Kargo
 * panelinden/kargocuyla yapmalı; siparişte uyarı bırakılır.
 */
export async function cancelShippingProviderOrders(params: {
  storeId: string;
  customerId: string;
  actorUserId: string | null;
  orderIds: string[];
}): Promise<void> {
  const { storeId, customerId, actorUserId, orderIds } = params;
  if (orderIds.length === 0) return;

  const integration = await getShippingIntegrationSecrets(storeId);
  const admin = createSupabaseAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select("id, order_number, tracking_number, shipping_provider_order_id, shipping_sync_error")
    .in("id", orderIds)
    .eq("store_id", storeId)
    .not("shipping_provider_order_id", "is", null);

  const cancelled: string[] = [];
  for (const order of orders ?? []) {
    if (!order.shipping_provider_order_id) continue;

    if (order.tracking_number) {
      await admin
        .from("orders")
        .update({ shipping_sync_error: "Sipariş iptal edildi ama kargo kodu üretilmişti — Basit Kargo panelinden kargoyu ayrıca iptal edin." })
        .eq("id", order.id)
        .eq("store_id", storeId);
      continue;
    }

    if (!integration?.apiToken) {
      await admin
        .from("orders")
        .update({ shipping_sync_error: "Sipariş iptal edildi ama kargo entegrasyonu kurulu olmadığı için Basit Kargo'daki kayıt silinemedi." })
        .eq("id", order.id)
        .eq("store_id", storeId);
      continue;
    }

    try {
      await cancelOrder(integration.apiToken, order.shipping_provider_order_id);
      await admin
        .from("orders")
        .update({ shipping_provider_order_id: null, shipping_sync_status: "not_sent", shipping_sync_error: null })
        .eq("id", order.id)
        .eq("store_id", storeId);
      cancelled.push(order.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      await admin
        .from("orders")
        .update({ shipping_sync_error: `İptal Basit Kargo'ya iletilemedi: ${message}`.slice(0, 500) })
        .eq("id", order.id)
        .eq("store_id", storeId);
    }
  }

  if (cancelled.length > 0) {
    await logAuditEvent({
      userId: actorUserId,
      customerId,
      action: "order.shipment_cancel",
      entityType: "order",
      entityId: null,
      metadata: { cancelledOrderIds: cancelled },
    });
  }
}
