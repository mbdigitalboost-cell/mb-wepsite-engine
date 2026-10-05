"use server";

import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getGuestOrderByNumberAndPhone } from "@/lib/commerce/public/order-lookup";
import { guestOrderLookupSchema } from "@/lib/validation/order";
import type { GuestOrderLookupState } from "./form-state";

const GENERIC_NOT_FOUND_ERROR = "Sipariş bulunamadı, bilgileri kontrol edin.";

/**
 * Misafir sipariş sorgusu — "Siparişlerim" devir metninin C maddesi.
 * checkout'un createOrderAction'ıyla AYNI "server-side yeniden doğrula,
 * client'a asla güvenme" ilkesi: client sadece orderNumber+phone gönderiyor,
 * eşleşme lib/commerce/public/order-lookup.ts'te (normalize edilmiş telefon
 * karşılaştırmasıyla) server-side yapılıyor.
 *
 * GÜVENLİK — enumeration'a karşı TEK VE AYNI genel hata: ister sipariş
 * numarası hiç yok, ister var ama telefon tutmuyor, ister form şekli
 * geçersiz (zod hatası) — HER durumda AYNI GENERIC_NOT_FOUND_ERROR dönüyor.
 * Hangi alanın yanlış olduğu asla ayrı ayrı belirtilmiyor — aksi halde bir
 * saldırgan "numara var ama telefon yanlış" / "numara hiç yok" farkından
 * geçerli sipariş numaralarını enumerate edebilirdi (order_number zaten
 * ardışık/global unique olduğu için bu risk gerçek).
 */
export async function lookupGuestOrderAction(
  storeSlug: string,
  _prevState: GuestOrderLookupState,
  formData: FormData,
): Promise<GuestOrderLookupState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { status: "error", error: GENERIC_NOT_FOUND_ERROR, order: null };
  }

  const parsed = guestOrderLookupSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { status: "error", error: GENERIC_NOT_FOUND_ERROR, order: null };
  }

  const order = await getGuestOrderByNumberAndPhone(store.id, parsed.data.orderNumber, parsed.data.phone);
  if (!order) {
    return { status: "error", error: GENERIC_NOT_FOUND_ERROR, order: null };
  }

  return { status: "success", error: null, order };
}
