"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { isOrderStatus, isPaymentStatus } from "@/lib/commerce/order-status-labels";
import { createShipment, generateBarcode, type ShippableOrder } from "@/lib/integrations/basit-kargo";
import { getShippingIntegrationSecrets } from "@/lib/integrations/store-shipping-integration";
import { cancelShippingProviderOrders, pushOrdersToShippingProvider } from "@/lib/integrations/shipping-push";
import type { OrderStatus } from "@/lib/supabase/types";

/**
 * Faz 21 — durum geçişinin kargo yan etkisi. Siparişin durumu ZATEN
 * güncellendikten sonra çağrılır; hiçbir hata durum değişikliğini geri
 * almaz (shipping-push.ts kendi içinde failed/hata yazar). confirmed →
 * Basit Kargo'ya barkodsuz gönderim (auto_push_on_confirm açıksa),
 * cancelled → barkodu olmayan Basit Kargo kaydını sil.
 */
async function syncShippingAfterStatusChange(params: {
  customerId: string;
  storeId: string;
  actorUserId: string;
  orderIds: string[];
  status: OrderStatus;
}): Promise<void> {
  const { customerId, storeId, actorUserId, orderIds, status } = params;
  if (orderIds.length === 0) return;
  try {
    if (status === "confirmed") {
      await pushOrdersToShippingProvider({ storeId, customerId, actorUserId, orderIds });
    } else if (status === "cancelled") {
      await cancelShippingProviderOrders({ storeId, customerId, actorUserId, orderIds });
    }
  } catch (error) {
    // Yan etki asıl işlemi asla düşürmez — sipariş durumu zaten değişti.
    console.error("[orders] shipping sync after status change failed:", error instanceof Error ? error.message : error);
  }
}

/**
 * store_editor+ (RLS: orders_update_editor_tier) — same tier as
 * toggleProductActiveAction (a status transition is reversible, not the
 * "kalıcı silme" tier reserved for store_admin+ elsewhere — and orders
 * have no delete path at all, see migration 0029's own header). Reads the
 * submitted status from formData rather than a bound argument (unlike
 * toggleProductActiveAction's fixed `nextActive`) because this is a real
 * <select> of 6 possible values, not a single on/off toggle.
 */
export async function updateOrderStatusAction(
  customerId: string,
  storeId: string,
  orderId: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const status = String(formData.get("status") ?? "");
  if (!isOrderStatus(status)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId).eq("store_id", storeId);

  if (error) {
    console.error("[orders] failed to update order status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order.status_update",
    entityType: "order",
    entityId: orderId,
    metadata: { status },
  });

  await syncShippingAfterStatusChange({ customerId, storeId, actorUserId: user.id, orderIds: [orderId], status });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`);
}

/**
 * FAZ 2.5 — store_editor+ (RLS: orders_update_editor_tier, same policy as
 * updateOrderStatusAction above — it already covers every column on this
 * table, no separate policy was added, see migration 0029's own comment).
 *
 * Reads the current row first so `paid_at` is set exactly ONCE, on the
 * real unpaid->paid transition — resubmitting the form with 'paid'
 * already selected (e.g. after also editing shipping info) never
 * overwrites an already-recorded payment timestamp with "now".
 */
export async function updateOrderPaymentStatusAction(
  customerId: string,
  storeId: string,
  orderId: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const paymentStatus = String(formData.get("paymentStatus") ?? "");
  if (!isPaymentStatus(paymentStatus)) return;

  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase
    .from("orders")
    .select("payment_status, paid_at")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!current) return;

  const shouldSetPaidAt = paymentStatus === "paid" && !current.paid_at;

  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
      ...(shouldSetPaidAt ? { paid_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[orders] failed to update payment status:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order.payment_status_update",
    entityType: "order",
    entityId: orderId,
    metadata: { paymentStatus },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`);
}

/**
 * FAZ 2.5 — store_editor+, same policy as above. No carrier integration
 * this phase (a separate, later phase — which carrier is a real question
 * still open) — carrier/tracking_number are plain free-text fields an
 * admin fills in by hand.
 *
 * Silently no-ops (returns without writing) if the order's status hasn't
 * reached 'shipped' yet — mirrors [orderId]/page.tsx's own gating of this
 * form to `status === 'shipped' || status === 'completed'`, so a stale
 * page (open in one tab while another tab moves the order back to an
 * earlier status) can't sneak a shipping-info write in through a form
 * that should have been disabled.
 *
 * shipped_at is set exactly ONCE, the first time this action actually
 * writes — same "set on the real transition, never overwritten later"
 * pattern as paid_at above (editing the tracking number a second time
 * after the order already shipped doesn't reset the shipped date).
 */
export async function updateShippingInfoAction(
  customerId: string,
  storeId: string,
  orderId: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase
    .from("orders")
    .select("status, shipped_at")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!current) return;
  if (current.status !== "shipped" && current.status !== "completed") return;

  const shouldSetShippedAt = !current.shipped_at;

  const { error } = await supabase
    .from("orders")
    .update({
      carrier: carrier || null,
      tracking_number: trackingNumber || null,
      ...(shouldSetShippedAt ? { shipped_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (error) {
    console.error("[orders] failed to update shipping info:", error.message);
    return;
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: "order.shipping_info_update",
    entityType: "order",
    entityId: orderId,
    metadata: { carrier: carrier || null, trackingNumber: trackingNumber || null },
  });

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`);
}

/**
 * "Uygula Butonu Çalışmıyor Gibi Görünüyor" ACİL devir metni — gerçek kök
 * neden BU fonksiyon değil, page.tsx'teki buton(lar)ın hiç pending/disabled
 * durumu olmamasıydı (bkz. order-bulk-submit-button.tsx'in kendi yorumu) —
 * ama BU fonksiyon da sessizdi: ne bir redirect+özet ne de zaten hedef
 * durumda olanları atlama vardı, kullanıcının gerçek testinde (#1/2/5/6/7/8
 * zaten completed'ken yine de UPDATE'lenmiş) bu ikisi birleşince "hiçbir
 * şey olmuyor" hissini pekiştirdi. İkisi de düzeltildi:
 *
 *   1) bulkAdvanceOrderStatusAction'ın AYNI "sadece uygun olanlara uygula,
 *      diğerlerini atla + özetle" deseni — burada "uygun" = zaten
 *      targetStatus'ta OLMAYAN (ters yönde bir filtre, ama aynı fikir).
 *   2) Artık redirect+`?bulkUpdated=N&bulkSkipped=M` ile page.tsx'e geri
 *      dönüyor — "Uygula" butonu da artık quickAction'larla AYNI görünür
 *      geri bildirimi veriyor.
 *
 * store_editor+ (updateOrderStatusAction ile AYNI tier).
 */
export async function bulkUpdateOrdersAction(
  customerId: string,
  storeId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const orderIds = formData.getAll("orderIds").map(String).filter(Boolean);
  const targetStatus = String(formData.get("targetStatus") ?? "");
  if (orderIds.length === 0 || !isOrderStatus(targetStatus)) return;

  const supabase = await createSupabaseServerClient();

  // Zaten hedef durumda olanlar atlanır — gereksiz UPDATE + "hiçbir şey
  // değişmedi ama yine de bir şey oldu" karışıklığını önler.
  const { data: eligible } = await supabase
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .eq("store_id", storeId)
    .neq("status", targetStatus);

  const eligibleIds = (eligible ?? []).map((row) => row.id);
  const skippedCount = orderIds.length - eligibleIds.length;
  let updatedCount = 0;

  if (eligibleIds.length > 0) {
    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: targetStatus })
      .in("id", eligibleIds)
      .eq("store_id", storeId)
      .select("id");

    if (error) {
      console.error("[orders] bulk status update failed:", error.message);
    } else {
      updatedCount = updated?.length ?? 0;
      await logAuditEvent({
        userId: user.id,
        customerId,
        action: "order.status_update",
        entityType: "order",
        entityId: null,
        metadata: { bulk: true, orderIds: eligibleIds, status: targetStatus, skippedCount },
      });
      await syncShippingAfterStatusChange({ customerId, storeId, actorUserId: user.id, orderIds: eligibleIds, status: targetStatus });
    }
  }

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  const separator = returnPath.includes("?") ? "&" : "?";
  redirect(`${returnPath}${separator}bulkUpdated=${updatedCount}&bulkSkipped=${skippedCount}`);
}

/**
 * Duruma özel hızlı aksiyon (Toplu Onayla / Toplu Hazırlanıyor Yap /
 * Toplu Tamamlandı Yap) — bulkUpdateOrdersAction'ın AKSİNE, SADECE o anda
 * GERÇEKTEN `fromStatus`'ta olan siparişlere uygulanır (client'ın hangi
 * satırları seçtiğine değil, sunucunun o anki canlı durumuna bakılıyor —
 * aynen Faz 17/Kısım A'nın koşullu silme mantığındaki "server client
 * state'e güvenmez" disiplini); karışık durumlu bir seçimde diğerleri
 * sessizce atlanır, sonuç `?bulkUpdated=N&bulkSkipped=M` query param'larıyla
 * geri taşınır (Kısım A'nın "N ürün silindi, M atlandı" özetiyle AYNI
 * desen). `fromStatus`/`toStatus`/`returnPath` page.tsx'te üç farklı
 * buton (Onayla/Hazırla/Tamamla) için üç farklı `.bind()` ile sabitlenir
 * — aynı fonksiyonun üç parametrelendirmesi, kod tekrarı yok.
 */
export async function bulkAdvanceOrderStatusAction(
  customerId: string,
  storeId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const orderIds = formData.getAll("orderIds").map(String).filter(Boolean);
  if (orderIds.length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { data: eligible } = await supabase
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .eq("store_id", storeId)
    .eq("status", fromStatus);

  const eligibleIds = (eligible ?? []).map((row) => row.id);
  const skippedCount = orderIds.length - eligibleIds.length;
  let updatedCount = 0;

  if (eligibleIds.length > 0) {
    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: toStatus })
      .in("id", eligibleIds)
      .eq("store_id", storeId)
      .select("id");

    if (error) {
      console.error("[orders] bulk advance failed:", error.message);
    } else {
      updatedCount = updated?.length ?? 0;
      await logAuditEvent({
        userId: user.id,
        customerId,
        action: "order.status_update",
        entityType: "order",
        entityId: null,
        metadata: { bulk: true, fromStatus, toStatus, orderIds: eligibleIds, skippedCount },
      });
      await syncShippingAfterStatusChange({ customerId, storeId, actorUserId: user.id, orderIds: eligibleIds, status: toStatus });
    }
  }

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  const separator = returnPath.includes("?") ? "&" : "?";
  redirect(`${returnPath}${separator}bulkUpdated=${updatedCount}&bulkSkipped=${skippedCount}`);
}

const SHIPMENT_ERROR_QUERY_MAX_LENGTH = 1500;
const HANDLER_CODE_PATTERN = /^[A-Z0-9_]{2,40}$/;

function buildShipmentRedirect(
  returnPath: string,
  created: number,
  skipped: number,
  errors: string[],
): string {
  const separator = returnPath.includes("?") ? "&" : "?";
  let url = `${returnPath}${separator}shipmentCreated=${created}&shipmentSkipped=${skipped}`;
  if (errors.length > 0) {
    url += `&shipmentErrors=${encodeURIComponent(errors.join(" | ").slice(0, SHIPMENT_ERROR_QUERY_MAX_LENGTH))}`;
  }
  return url;
}

/**
 * Kargoya Hazırla — Faz 20'de gerçek Basit Kargo implementasyonu, Faz
 * 21'de mağaza bazlı token + "önce shipping_provider_order_id'ye bak"
 * kuralı. Fonksiyon imzası ve çağrıldığı yer (page.tsx'teki "Kargoya
 * Hazırla" butonu) SABİT; formdan `handlerCode` ve `desiKg` okunuyor.
 *
 * Akış, seçili her uygun sipariş için (uygun = status 'preparing' VE
 * tracking_number boş — zaten kargo kodu olan sipariş için ikinci bir
 * kargo açılmaz, skip edilir):
 *  - shipping_provider_order_id DOLUYSA (onaylanınca otomatik gönderildi):
 *    POST /v2/order/{id}/barcode — sadece barkod üretir, Basit Kargo'da
 *    ikinci bir sipariş AÇILMAZ (Idempotency-Key `${orderId}:barcode`);
 *  - BOŞSA (otomatik gönderim kapalıydı / başarısızdı / eski sipariş):
 *    POST /v2/order/barcode — oluştur + barkod tek çağrı
 *    (Idempotency-Key `${orderId}:ship`);
 *  - başarıda carrier/tracking_number/shipped_at + shipping_provider_order_id
 *    + shipping_sync_status='sent' yazılır. Durum BİLEREK 'shipped'e
 *    İLERLETİLMİYOR: "barkod üretildi" ≠ "kargocu teslim aldı" — gerçek
 *    ilerleme Basit Kargo webhook'undan gelir;
 *  - Basit Kargo'nun döndürdüğü hata, siparişe özel ("#14: ...") olarak
 *    admin'e AYNEN gösterilir, sessizce yutulmaz;
 *  - sonuç Faz 18'in aynı redirect+banner deseniyle geri döner:
 *    ?shipmentCreated=N&shipmentSkipped=M&shipmentErrors=...
 *
 * Token mağaza kaydında yoksa (ya da entegrasyon pasifse) hiçbir API
 * çağrısı yapılmadan tek bir net mesajla döner — panel çökmez.
 */
export async function bulkPrepareForShipmentAction(
  customerId: string,
  storeId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const orderIds = formData.getAll("orderIds").map(String).filter(Boolean);
  if (orderIds.length === 0) return;

  const integration = await getShippingIntegrationSecrets(storeId);
  if (!integration?.apiToken) {
    redirect(
      buildShipmentRedirect(returnPath, 0, 0, [
        "Kargo entegrasyonu kurulmadı — Mağaza → Kargo sayfasından Basit Kargo API anahtarını girin.",
      ]),
    );
  }
  if (!integration.isActive) {
    redirect(buildShipmentRedirect(returnPath, 0, 0, ["Kargo entegrasyonu pasif — Mağaza → Kargo sayfasından aktif edin."]));
  }

  const handlerCode = String(formData.get("handlerCode") ?? "").trim().toUpperCase();
  if (!HANDLER_CODE_PATTERN.test(handlerCode)) {
    redirect(buildShipmentRedirect(returnPath, 0, 0, ["Kargo firması seçilmedi."]));
  }

  const desiKgRaw = Number(formData.get("desiKg") ?? integration.defaultDesi);
  const desiKg = Number.isFinite(desiKgRaw) && desiKgRaw > 0 ? Math.min(desiKgRaw, 500) : integration.defaultDesi;

  const supabase = await createSupabaseServerClient();
  const { data: eligible } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, customer_email, address_city, address_district, address_neighborhood, address_line, subtotal, discount_amount, payment_method, payment_status, shipping_provider_order_id",
    )
    .in("id", orderIds)
    .eq("store_id", storeId)
    .eq("status", "preparing")
    .is("tracking_number", null);

  type PreparableOrder = ShippableOrder & { shipping_provider_order_id: string | null };
  const eligibleOrders = (eligible ?? []) as PreparableOrder[];
  const skippedCount = orderIds.length - eligibleOrders.length;
  const createdOrderIds: string[] = [];
  const errors: string[] = [];

  // Sıralı (paralel değil): dakikada 600 istek limiti için nazik, ve
  // hata mesajları sipariş sırasıyla eşleşsin.
  for (const order of eligibleOrders) {
    try {
      const shipment = order.shipping_provider_order_id
        ? await generateBarcode(integration.apiToken, order, order.shipping_provider_order_id, handlerCode)
        : await createShipment(integration.apiToken, { order, handlerCode, desiKg });

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          carrier: shipment.handlerName ?? handlerCode,
          tracking_number: shipment.barcode,
          shipped_at: new Date().toISOString(),
          shipping_provider_order_id: shipment.basitKargoOrderId ?? order.shipping_provider_order_id,
          shipping_sync_status: "sent",
          shipping_sync_error: null,
        })
        .eq("id", order.id)
        .eq("store_id", storeId);

      if (updateError) {
        // Kargo Basit Kargo tarafında OLUŞTU ama bizde yazılamadı — barkodu
        // mesajda admin'e veriyoruz ki sipariş detayından elle girebilsin.
        errors.push(`#${order.order_number}: kargo kodu üretildi (${shipment.barcode}) ama kaydedilemedi: ${updateError.message}`);
        continue;
      }

      createdOrderIds.push(order.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      errors.push(`#${order.order_number}: ${message}`);
      await supabase
        .from("orders")
        .update({ shipping_sync_status: "failed", shipping_sync_error: message.slice(0, 500) })
        .eq("id", order.id)
        .eq("store_id", storeId);
    }
  }

  if (createdOrderIds.length > 0 || errors.length > 0) {
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "order.shipment_prepare",
      entityType: "order",
      entityId: null,
      metadata: {
        bulk: true,
        handlerCode,
        desiKg,
        createdOrderIds,
        failedCount: errors.length,
        skippedCount,
      },
    });
  }

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  redirect(buildShipmentRedirect(returnPath, createdOrderIds.length, skippedCount, errors));
}

/**
 * Faz 21 — "Tekrar Gönder": otomatik gönderimi başarısız olmuş
 * (shipping_sync_status='failed') ya da hiç gönderilmemiş bir onaylı/
 * hazırlanan siparişi Basit Kargo'ya elle (barkodsuz) düşürür.
 * force=true: auto_push_on_confirm kapalı olsa da gönderir — admin açıkça
 * istedi. Sonuç aynı ?shipmentCreated banner'ıyla döner.
 */
export async function retryShipmentPushAction(
  customerId: string,
  storeId: string,
  orderId: string,
  returnPath: string,
): Promise<void> {
  const { user } = await requireStoreEditorAccess(storeId);

  const result = await pushOrdersToShippingProvider({ storeId, customerId, actorUserId: user.id, orderIds: [orderId], force: true });

  const errors: string[] = [];
  if (result.skippedReason === "not_configured") {
    errors.push("Kargo entegrasyonu kurulmadı ya da pasif — Mağaza → Kargo sayfasını kontrol edin.");
  }
  for (const failure of result.failed) errors.push(`#${failure.orderNumber}: ${failure.message}`);
  const skipped = result.skippedReason ? 0 : result.pushed.length + result.failed.length === 0 ? 1 : 0;

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders/${orderId}`);
  redirect(buildShipmentRedirect(returnPath, result.pushed.length, skipped, errors));
}
