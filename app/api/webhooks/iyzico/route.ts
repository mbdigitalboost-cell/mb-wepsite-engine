import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { computeIyzicoWebhookSignatureV3, signaturesMatch } from "@/lib/integrations/iyzico-signature";
import { getPaymentIntegrationCredentials, touchPaymentWebhook } from "@/lib/integrations/store-payment-integration";
import { finalizeCardPayment } from "@/lib/commerce/payments/iyzico-checkout";

/**
 * Faz 22 — iyzico webhook (emniyet ağı: müşteri callback'ten önce sekmeyi
 * kapatırsa ödeme yine de siparişe işlenir). iyzico Merchant Panel →
 * Ayarlar → Firma Ayarları → İşyeri Bildirimleri'ne admin sayfasının
 * gösterdiği adres (…/api/webhooks/iyzico?store=<storeId>) yazılır.
 *
 * HPP formatı (Checkout Form): { paymentConversationId, merchantId, token,
 * status, iyziReferenceCode, iyziEventType: "CHECKOUT_FORM_AUTH",
 * iyziEventTime, iyziPaymentId }. Başlık X-IYZ-SIGNATURE-V3 =
 * HMAC-SHA256(secretKey, secretKey+iyziEventType+iyziPaymentId+token+
 * paymentConversationId+status) hex — hesapta "webhook signature" özelliği
 * AÇIKSA gelir (entegrasyon@iyzico.com ile açılıyor). Başlık varsa
 * doğrulanır, uymazsa 401. Başlık yoksa istek yine de kabul edilir, ÇÜNKÜ
 * webhook gövdesine hiçbir koşulda güvenilmez: sonuç her durumda token ile
 * iyzico'dan SUNUCUDAN sorgulanır (finalizeCardPayment) — sahte bir webhook
 * en fazla gerçek sonucun sorgulanmasını tetikler, siparişi "ödendi"
 * yapamaz. iyzico 2xx görmezse 15 dk arayla 3 kez tekrar eder; sipariş
 * bulunamasa da 200 dönülür (sonsuz tekrar olmasın).
 */
export const dynamic = "force-dynamic";

const WEBHOOK_RATE_LIMIT = { limit: 120, windowMs: 60 * 1000 };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(value: unknown, maxLength: number): string | null {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request);
  const limit = rateLimit(`iyzico-webhook:${ip}`, WEBHOOK_RATE_LIMIT);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const storeId = new URL(request.url).searchParams.get("store") ?? "";
  if (!UUID_PATTERN.test(storeId)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const credentials = await getPaymentIntegrationCredentials(storeId, { requireActive: false });
  if (!credentials) return NextResponse.json({ error: "Unknown store" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = readString(body.iyziEventType, 60) ?? "";
  const token = readString(body.token, 200);
  const status = readString(body.status, 40) ?? "";
  const paymentConversationId = readString(body.paymentConversationId, 100) ?? "";
  const iyziPaymentId = readString(body.iyziPaymentId, 50) ?? "";

  const providedSignature = request.headers.get("x-iyz-signature-v3");
  if (providedSignature) {
    const expected = computeIyzicoWebhookSignatureV3(credentials.secretKey, {
      iyziEventType: eventType,
      iyziPaymentId,
      token: token ?? "",
      paymentConversationId,
      status,
    });
    if (!signaturesMatch(expected, providedSignature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  await touchPaymentWebhook(storeId);

  // Sadece Checkout Form olayları; abonelik/direkt API formatları bu
  // mağazada kullanılmıyor — 200 ile yut (iyzico tekrar denemesin).
  if (eventType !== "CHECKOUT_FORM_AUTH" || !token) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const result = await finalizeCardPayment({ storeId, token, source: "webhook", credentials });

  if (result.outcome !== "not_found" && result.order) {
    const admin = createSupabaseAdminClient();
    const { data: storeRow } = await admin.from("stores").select("customer_id").eq("id", storeId).maybeSingle();
    if (storeRow?.customer_id) {
      const ordersPath = `/dashboard/customers/${storeRow.customer_id}/stores/${storeId}/orders`;
      revalidatePath(ordersPath);
      revalidatePath(`${ordersPath}/${result.order.id}`);
    }
  }

  return NextResponse.json({ ok: true, outcome: result.outcome });
}
