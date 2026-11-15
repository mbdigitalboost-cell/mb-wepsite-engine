import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/send-email";
import { findStoreSiteBySlug } from "@/lib/sites/registry";
import { buildStoreHref } from "@/lib/sites/store-paths";
import { formatPrice } from "@/lib/utils/format-price";
import type { OrderReturnKind } from "@/lib/supabase/types";

/**
 * Faz 30 — müşteriye talep e-postaları (talep alındı / onaylandı /
 * reddedildi / iade edildi). Gönderen adı mağazanın adı, linkler mağazanın
 * kendi domaininde (Faz 29). Müşterinin e-postası yoksa ya da Resend
 * yapılandırılmamışsa SESSİZCE atlanır — yasal teyit ekranda zaten verilir
 * (MSY m.11/2: talebin ulaştığı derhal teyit edilir).
 */
export type ReturnEmailEvent = "requested" | "approved" | "rejected" | "refunded";

export async function sendReturnEmail(params: {
  storeId: string;
  to: string | null;
  orderNumber: number;
  returnNumber: number;
  kind: OrderReturnKind;
  event: ReturnEmailEvent;
  refundAmount?: number;
  returnCode?: string | null;
  carrierName?: string | null;
  instructions?: string | null;
  rejectionReason?: string | null;
}): Promise<void> {
  if (!params.to) return;
  const admin = createSupabaseAdminClient();
  const { data: store } = await admin.from("stores").select("name, slug").eq("id", params.storeId).maybeSingle();
  if (!store) return;

  const site = findStoreSiteBySlug(store.slug);
  const ordersUrl = site ? `${site.canonicalOrigin}${buildStoreHref(store.slug, store.slug, "/siparislerim")}` : null;
  const noun = params.kind === "cancel" ? "iptal" : "iade";
  const ref = `Sipariş #${params.orderNumber} · Talep #${params.returnNumber}`;

  let subject = "";
  const lines: string[] = [];
  switch (params.event) {
    case "requested":
      subject = `${store.name}: ${noun} talebiniz bize ulaştı`;
      lines.push(`${ref}`, "", `${noun.charAt(0).toUpperCase() + noun.slice(1)} talebiniz bize ulaştı. İnceleyip size bilgi vereceğiz.`);
      break;
    case "approved":
      subject = `${store.name}: ${noun} talebiniz onaylandı`;
      lines.push(ref, "", `${noun.charAt(0).toUpperCase() + noun.slice(1)} talebiniz onaylandı.`);
      if (params.kind === "return") {
        if (params.carrierName) lines.push(`Kargo firması: ${params.carrierName}`);
        if (params.returnCode) lines.push(`İade kodu: ${params.returnCode}`);
        if (params.instructions) lines.push("", params.instructions);
        lines.push("", "Ürünü kargoya verdikten sonra sipariş sayfanızdan \"Kargoya teslim ettim\" butonuna basın.");
      }
      break;
    case "rejected":
      subject = `${store.name}: ${noun} talebiniz hakkında`;
      lines.push(ref, "", `${noun.charAt(0).toUpperCase() + noun.slice(1)} talebiniz onaylanmadı.`);
      if (params.rejectionReason) lines.push(`Gerekçe: ${params.rejectionReason}`);
      break;
    case "refunded":
      subject = `${store.name}: ödemeniz iade edildi`;
      lines.push(ref, "", `${formatPrice(params.refundAmount ?? 0)} tutarındaki ödemeniz iade edildi. Bankanıza göre hesabınıza yansıması birkaç gün sürebilir.`);
      break;
  }
  if (ordersUrl) lines.push("", `Siparişlerim: ${ordersUrl}`);

  const result = await sendEmail({ to: params.to, subject, text: lines.join("\n"), fromName: store.name });
  if (!result.sent) console.info("[returns] email skipped:", result.error);
}
