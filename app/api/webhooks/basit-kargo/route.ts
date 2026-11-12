import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import type { OrderStatus } from "@/lib/supabase/types";

/**
 * Faz 20 — Basit Kargo "Durum Değişikliği" webhook'u. Basit Kargo
 * panelinde (Ayarlar → Webhook) bu route'un tam URL'i tanımlanır
 * (kullanıcının kendi yapacağı adım); kargo ana durumu değiştiğinde
 * Basit Kargo buraya POST atar:
 *   { id, orderNumber, orderId, barcode, status, handler:{name,code},
 *     handlerShipmentCode }
 *
 * Eşleme: sipariş `tracking_number = barcode` ile bulunur (Kargoya Hazırla
 * barkodu oraya yazıyor — bkz. orders/actions.ts bulkPrepareForShipmentAction).
 *   SHIPPED, OUT_FOR_DELIVERY → shipped
 *   DELIVERED                 → completed
 *   NEW, READY_TO_SHIP        → dokunma
 *   NEEDS_SUPPORT, DELAYED, RETURNING, RETURNED, LOST → durum DEĞİŞMEZ,
 *     `note`'a "[Kargo uyarısı: X]" satırı eklenir (yeni kolon/migration
 *     yerine devir metninin "basit tut" seçeneği).
 *
 * Güvenlik: Basit Kargo dokümanında imzalama/secret başlığı YOK. Bu yüzden
 * (a) opsiyonel paylaşımlı sır: BASIT_KARGO_WEBHOOK_SECRET tanımlıysa
 *     `x-webhook-secret` başlığı VEYA `?secret=` query param'ı eşleşmek
 *     zorunda (panel sadece URL alıyorsa query param yolu kullanılır);
 *     tanımlı değilse bu katman atlanır;
 * (b) barkod bizim DB'mizde yoksa istek sessizce yok sayılır (200,
 *     ignored:true — 4xx döndürüp tekrar denemeleri tetiklememek için);
 * (c) idempotent: durum sadece İLERİ yönde değişir (completed → shipped
 *     gibi geri alma yok, cancelled hiç dokunulmaz), uyarı satırı aynı
 *     durum için en fazla bir kez eklenir — aynı webhook tekrar gelse
 *     ikinci bir etki yaratmaz;
 * (d) pre-auth rate limit (lib/security/rate-limit.ts'in mevcut deseni).
 *
 * Oturum yok → service-role admin client (barkod Basit Kargo tarafından
 * global benzersiz üretildiği için çapraz-kiracı araması güvenli; yazma
 * yine bulunan satırın kendi store_id'siyle sınırlı).
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

/** Yalnızca ileri yönde geçiş — webhook sırası karışık gelse bile (DELIVERED'dan sonra gecikmiş bir SHIPPED) durum geri sarılmaz. */
const STATUS_RANK: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  shipped: 3,
  completed: 4,
  cancelled: -1,
};

function safeEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

interface WebhookPayload {
  barcode: string;
  status: string;
  handlerName: string | null;
}

function parsePayload(body: unknown): WebhookPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const barcode = typeof record.barcode === "string" ? record.barcode.trim() : "";
  const status = typeof record.status === "string" ? record.status.trim().toUpperCase() : "";
  if (!barcode || !status || barcode.length > 100 || status.length > 40) return null;

  const handler = record.handler && typeof record.handler === "object" ? (record.handler as Record<string, unknown>) : null;
  const handlerName = handler && typeof handler.name === "string" ? handler.name : null;

  return { barcode, status, handlerName };
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

  const secret = serverEnv.basitKargoWebhookSecret;
  if (secret) {
    const provided = request.headers.get(SECRET_HEADER) ?? new URL(request.url).searchParams.get("secret");
    if (!provided || !safeEqual(provided, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

  const admin = createSupabaseAdminClient();
  const { data: order, error: lookupError } = await admin
    .from("orders")
    .select("id, store_id, order_number, status, note, carrier")
    .eq("tracking_number", payload.barcode)
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[basit-kargo webhook] order lookup failed:", lookupError.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const currentStatus = order.status as OrderStatus;
  const update: { status?: OrderStatus; note?: string; carrier?: string } = {};

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

  if (payload.handlerName && payload.handlerName !== order.carrier) {
    update.carrier = payload.handlerName;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, updated: false });
  }

  const { error: updateError } = await admin.from("orders").update(update).eq("id", order.id).eq("store_id", order.store_id);
  if (updateError) {
    console.error("[basit-kargo webhook] order update failed:", updateError.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const { data: store } = await admin.from("stores").select("customer_id").eq("id", order.store_id).maybeSingle();
  if (store?.customer_id) {
    const ordersPath = `/dashboard/customers/${store.customer_id}/stores/${order.store_id}/orders`;
    revalidatePath(ordersPath);
    revalidatePath(`${ordersPath}/${order.id}`);
  }

  return NextResponse.json({ ok: true, updated: true, orderNumber: order.order_number, applied: Object.keys(update) });
}
