import { NextResponse } from "next/server";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getShippingIntegrationSecrets } from "@/lib/integrations/store-shipping-integration";
import { getLabelSvg } from "@/lib/integrations/basit-kargo";

/**
 * Faz 21 — "Etiketi İndir": Basit Kargo'nun GET /label/svg/{id} çıktısını
 * sunucu tarafında (mağazanın kendi token'ıyla) çekip SVG olarak döner.
 * Token tarayıcıya hiç gitmez. Erişim: sipariş sayfalarıyla AYNI tier
 * (requireStoreEditorAccess) + siparişin bu mağazaya ait olduğu .eq ile
 * doğrulanır. shipping_provider_order_id Faz 21'de eklendi — etiket
 * ancak barkod üretilmişse anlamlı, o yüzden tracking_number da aranır.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string; storeId: string; orderId: string }> },
): Promise<Response> {
  const { customerId, storeId, orderId } = await params;
  await requireStoreEditorAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, shipping_provider_order_id, tracking_number")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!order?.shipping_provider_order_id || !order.tracking_number) {
    return NextResponse.json({ error: "Bu sipariş için henüz kargo kodu üretilmedi." }, { status: 404 });
  }

  const integration = await getShippingIntegrationSecrets(storeId);
  if (!integration?.apiToken) {
    return NextResponse.json({ error: "Kargo entegrasyonu kurulu değil." }, { status: 409 });
  }

  try {
    const svg = await getLabelSvg(integration.apiToken, order.shipping_provider_order_id);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `inline; filename="siparis-${order.order_number}-kargo-etiketi.svg"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Etiket alınamadı.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
