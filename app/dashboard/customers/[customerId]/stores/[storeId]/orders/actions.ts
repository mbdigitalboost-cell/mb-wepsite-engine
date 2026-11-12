"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { isOrderStatus, isPaymentStatus } from "@/lib/commerce/order-status-labels";
import { createShipment, isBasitKargoConfigured, type ShippableOrder } from "@/lib/integrations/basit-kargo";
import type { OrderStatus } from "@/lib/supabase/types";

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
 * Kargoya Hazırla — Faz 20: Faz 18'de bırakılan yer tutucunun GERÇEK
 * Basit Kargo implementasyonu. Fonksiyon imzası ve çağrıldığı yer
 * (page.tsx'teki "Kargoya Hazırla" butonu) Faz 18'deki gibi SABİT —
 * sadece gövde doldu; ek olarak aynı formdan `handlerCode` (firma /
 * ECONOMIC / FAST) ve `desiKg` okunuyor.
 *
 * Akış, seçili her uygun sipariş için:
 *  - uygun = status 'preparing' VE tracking_number boş (zaten kargo kodu
 *    olan bir sipariş için ikinci bir kargo açılmaz — skip edilir);
 *  - createShipment() → barkod; başarıda carrier/tracking_number/
 *    shipped_at yazılır. Durum BİLEREK 'shipped'e İLERLETİLMİYOR:
 *    "barkod üretildi" ≠ "kargocu teslim aldı" — gerçek ilerleme Basit
 *    Kargo webhook'undan gelir (app/api/webhooks/basit-kargo/route.ts);
 *  - Basit Kargo'nun döndürdüğü hata, siparişe özel ("#14: ...") olarak
 *    admin'e AYNEN gösterilir, sessizce yutulmaz;
 *  - sonuç Faz 18'in aynı redirect+banner deseniyle geri döner:
 *    ?shipmentCreated=N&shipmentSkipped=M&shipmentErrors=...
 *
 * Token (BASIT_KARGO_API_TOKEN) yoksa hiçbir API çağrısı yapılmadan tek
 * bir net mesajla döner — panel çökmez.
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

  if (!isBasitKargoConfigured()) {
    redirect(
      buildShipmentRedirect(returnPath, 0, 0, [
        "Kargo API anahtarı henüz tanımlanmamış — ortam değişkenleri ayarlarından BASIT_KARGO_API_TOKEN ekleyin.",
      ]),
    );
  }

  const handlerCode = String(formData.get("handlerCode") ?? "").trim().toUpperCase();
  if (!HANDLER_CODE_PATTERN.test(handlerCode)) {
    redirect(buildShipmentRedirect(returnPath, 0, 0, ["Kargo firması seçilmedi."]));
  }

  const desiKgRaw = Number(formData.get("desiKg") ?? 1);
  const desiKg = Number.isFinite(desiKgRaw) && desiKgRaw > 0 ? Math.min(desiKgRaw, 500) : 1;

  const supabase = await createSupabaseServerClient();
  const { data: eligible } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, customer_email, address_city, address_district, address_neighborhood, address_line, subtotal, discount_amount, payment_method, payment_status",
    )
    .in("id", orderIds)
    .eq("store_id", storeId)
    .eq("status", "preparing")
    .is("tracking_number", null);

  const eligibleOrders = (eligible ?? []) as ShippableOrder[];
  const skippedCount = orderIds.length - eligibleOrders.length;
  const createdOrderIds: string[] = [];
  const errors: string[] = [];

  // Sıralı (paralel değil): dakikada 600 istek limiti için nazik, ve
  // hata mesajları sipariş sırasıyla eşleşsin.
  for (const order of eligibleOrders) {
    try {
      const shipment = await createShipment({ order, handlerCode, desiKg });

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          carrier: shipment.handlerName ?? handlerCode,
          tracking_number: shipment.barcode,
          shipped_at: new Date().toISOString(),
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
    }
  }

  if (createdOrderIds.length > 0 || errors.length > 0) {
    await logAuditEvent({
      userId: user.id,
      customerId,
      action: "order.shipment_create",
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
