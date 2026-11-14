import { storeBase } from "@/lib/sites/store-href";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { finalizeCardPayment } from "@/lib/commerce/payments/iyzico-checkout";

/**
 * Faz 22 — iyzico Checkout Form callbackUrl. iyzico, ödeme denemesi
 * bitince müşterinin TARAYICISINI buraya site-dışı bir POST ile
 * (application/x-www-form-urlencoded, alan: token) yönlendirir — yani
 * SameSite çerezleri gelmez, oturuma GÜVENİLMEZ; sipariş yalnızca token /
 * conversationId ile çözülür ve sonuç iyzico'dan SUNUCUDAN sorgulanır
 * (lib/commerce/payments/iyzico-checkout.ts → finalizeCardPayment:
 * imza, tutar, basketId/conversationId eşleşmesi, fraudStatus).
 *
 * Mağaza ?store=<storeId> ile gelir (callbackUrl'i biz kurduk, odeme/
 * [orderId]/page.tsx) — anahtar çifti ona göre seçilir. Sonuç 303 ile:
 *   ödendi   → /store/<slug>/sepet?siparis=<id>&odeme=basarili (başarı
 *              ekranı; sepet ANCAK orada, sunucu doğrulamasından sonra boşalır)
 *   başarısız→ /store/<slug>/odeme/<id>?hata=1 (Tekrar Dene / Başka yöntem)
 * GET de desteklenir (bazı tarayıcılar POST sonrası geri tuşuyla GET atar).
 */
export const dynamic = "force-dynamic";

const CALLBACK_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readToken(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  if (request.method === "GET") return url.searchParams.get("token");
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { token?: unknown };
      return typeof body.token === "string" ? body.token : null;
    }
    const form = await request.formData();
    const token = form.get("token");
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request);
  const limit = rateLimit(`iyzico-callback:${ip}`, CALLBACK_RATE_LIMIT);
  if (!limit.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const url = new URL(request.url);
  const storeId = url.searchParams.get("store") ?? "";
  if (!UUID_PATTERN.test(storeId)) return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const token = (await readToken(request))?.trim() ?? "";
  if (!token || token.length > 200) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: store } = await admin.from("stores").select("id, slug, customer_id").eq("id", storeId).maybeSingle();
  if (!store) return NextResponse.json({ error: "Unknown store" }, { status: 404 });

  const result = await finalizeCardPayment({ storeId: store.id, token, source: "callback" });
  const origin = url.origin;

  if (result.outcome === "not_found") {
    return NextResponse.redirect(`${origin}${storeBase(store.slug)}/siparislerim`, 303);
  }

  const ordersPath = `/dashboard/customers/${store.customer_id}/stores/${store.id}/orders`;
  if (result.order) {
    revalidatePath(ordersPath);
    revalidatePath(`${ordersPath}/${result.order.id}`);
  }

  if (result.outcome === "paid") {
    return NextResponse.redirect(`${origin}${storeBase(store.slug)}/sepet?siparis=${result.order.id}&odeme=basarili`, 303);
  }
  if (result.order) {
    return NextResponse.redirect(`${origin}${storeBase(store.slug)}/odeme/${result.order.id}?hata=1`, 303);
  }
  return NextResponse.redirect(`${origin}${storeBase(store.slug)}/sepet`, 303);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}
