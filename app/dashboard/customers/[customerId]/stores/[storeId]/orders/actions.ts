"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import { isOrderStatus, isPaymentStatus } from "@/lib/commerce/order-status-labels";
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

/**
 * Kargoya Hazırla — YARINKI "Basit Kargo" entegrasyonu için BİLEREK ayrı,
 * isimlendirilmiş bir action. bulkAdvanceOrderStatusAction'dan BİLEREK
 * AYRI tutuldu (onu çağırmıyor, ondan çağrılmıyor) — yarın Basit Kargo
 * eklenince SADECE bu fonksiyonun İÇİ değişecek (gerçek API çağrısı +
 * carrier/tracking_number doldurma), fonksiyon imzası ve çağrıldığı yer
 * (page.tsx'teki "Kargoya Hazırla" butonu) SABİT kalacak — UI/seçim
 * mantığına hiç dokunulmayacak. Skip/özet mantığı bulkAdvanceOrderStatusAction
 * ile AYNI FİKİR ama kasıtlı olarak KENDİ bağımsız kopyası, paylaşılan bir
 * helper'a çıkarılmadı — ileride buranın içini değiştirmek diğer akışları
 * hiç etkilemesin diye.
 *
 * shipped_at BİLEREK set edilmiyor — bu codebase'de o alan SADECE
 * updateShippingInfoAction'ın gerçek kargo bilgisi girildiği an set
 * ediliyor (mevcut invariant, bkz. o fonksiyonun kendi yorumu), sadece
 * durum 'shipped' olması bunu tetiklemiyor; bu davranış burada da aynen
 * korunuyor.
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

  const supabase = await createSupabaseServerClient();
  const { data: eligible } = await supabase
    .from("orders")
    .select("id")
    .in("id", orderIds)
    .eq("store_id", storeId)
    .eq("status", "preparing");

  const eligibleIds = (eligible ?? []).map((row) => row.id);
  const skippedCount = orderIds.length - eligibleIds.length;
  let updatedCount = 0;

  if (eligibleIds.length > 0) {
    // TODO(Kargo Entegrasyonu — Basit Kargo): Burada seçili siparişler
    // Basit Kargo API'sine gönderilip gerçek takip no/barkod alınacak.
    // Şimdilik sadece durum 'shipped' yapılıyor, carrier/tracking_number
    // boş kalıyor (admin sipariş detayından manuel girilebilir — Faz 2.5).
    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: "shipped" })
      .in("id", eligibleIds)
      .eq("store_id", storeId)
      .select("id");

    if (error) {
      console.error("[orders] bulk prepare-for-shipment failed:", error.message);
    } else {
      updatedCount = updated?.length ?? 0;
      await logAuditEvent({
        userId: user.id,
        customerId,
        action: "order.status_update",
        entityType: "order",
        entityId: null,
        metadata: { bulk: true, bulkAction: "prepareForShipment", orderIds: eligibleIds, skippedCount },
      });
    }
  }

  revalidatePath(`/dashboard/customers/${customerId}/stores/${storeId}/orders`);
  const separator = returnPath.includes("?") ? "&" : "?";
  redirect(`${returnPath}${separator}bulkUpdated=${updatedCount}&bulkSkipped=${skippedCount}`);
}
