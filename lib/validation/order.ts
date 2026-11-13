import { z } from "zod";

/**
 * FAZ 2.6 — informational only, NOT a real payment gateway (Faz 3's job,
 * not started without first asking which provider(s) — same reasoning as
 * migration 0029's carrier-integration deferral). Plain text on the DB
 * side (migration 0030's `payment_method` column, nullable there only
 * because orders created before that migration have no value) — this
 * const array is what actually constrains it for every NEW order.
 */
export const PAYMENT_METHODS = ["Kapıda Nakit", "Kapıda Kart", "Havale-EFT"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Faz 22 — iyzico Checkout Form ile online kart ödemesi. PAYMENT_METHODS'a
 * BİLEREK eklenmedi: o liste "bilgi amaçlı, ödeme entegrasyonu yok" üç
 * yöntem ve Basit Kargo'nun kapıda ödeme eşlemesi (lib/integrations/
 * basit-kargo.ts) ile diğer yerlerde dolaşıyor. Kart yalnızca mağazanın
 * iyzico entegrasyonu aktifse vitrinde görünür (createOrderAction server
 * tarafında da kontrol eder — client'ın "aktif" iddiasına güvenilmez).
 */
export const CARD_PAYMENT_METHOD = "Kredi Kartı" as const;
export const CHECKOUT_PAYMENT_METHODS = [...PAYMENT_METHODS, CARD_PAYMENT_METHOD] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export const BILLING_TYPES = ["individual", "corporate"] as const;

const DIGITS_11 = /^\d{11}$/;
const DIGITS_10 = /^\d{10}$/;

/**
 * FAZ 2 (mağaza sepeti/sipariş), FAZ 2.6 il/ilçe/mahalle + ödeme yöntemi —
 * checkout customer info. Mirrors migrations 0029/0030_orders.sql's
 * `orders` table exactly. storeId/subtotal/status are NEVER fields here —
 * those come from the route (storeSlug -> resolved store) and the
 * server's own price recomputation (lib/commerce/pricing.ts), never from
 * client input.
 *
 * addressCity/addressDistrict are no longer free text: the checkout UI
 * (checkout-form.tsx) sources them from lib/data/turkey-locations.json
 * via cascading selects, so by the time they reach here they're always
 * one of that dataset's own province/district names — this schema still
 * just validates "a non-empty string", the same shape as before, trusting
 * the dropdown UI to constrain the actual value (same posture as
 * categoryId/brandId elsewhere in this codebase: the form UI is the
 * practical constraint, this layer only checks shape/presence).
 *
 * addressNeighborhood (mahalle) is REQUIRED free text, not a third
 * cascading dropdown level — lib/data/turkey-locations.README.md explains
 * why (the source dataset's neighborhood level is ~16.7MB across 73,496
 * rows, impractical to bundle for a checkout field). Still mandatory:
 * dropping the dropdown was the explicitly-flagged trade-off, not
 * dropping the requirement itself.
 */
export const checkoutFormSchema = z.object({
  customerName: z.string().trim().min(1, "Ad soyad zorunlu.").max(200),
  customerPhone: z.string().trim().min(1, "Telefon zorunlu.").max(30),
  customerEmail: z.string().trim().email("Geçerli bir e-posta girin.").max(255).optional().or(z.literal("")),
  addressCity: z.string().trim().min(1, "İl zorunlu.").max(100),
  addressDistrict: z.string().trim().min(1, "İlçe zorunlu.").max(100),
  addressNeighborhood: z.string().trim().min(1, "Mahalle zorunlu.").max(150),
  addressLine: z.string().trim().min(1, "Adres zorunlu.").max(500),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS, { message: "Geçerli bir ödeme yöntemi seçin." }),
  /**
   * Faz 22 — Fatura Bilgileri (tüm ödeme yöntemlerinde). Bireysel: ad soyad
   * opsiyonel (boşsa müşteri adı), TCKN opsiyonel (11 hane). Kurumsal:
   * ünvan + VKN (10 hane) + vergi dairesi zorunlu. Fatura adresi teslimatla
   * aynı değilse il/ilçe/adres zorunlu. TCKN kişisel veri — sadece siparişe
   * yazılır, log/audit'e asla (createOrderAction'ın audit metadata'sında yok).
   */
  billingType: z.enum(BILLING_TYPES).default("individual"),
  billingName: z.string().trim().max(200).optional().or(z.literal("")),
  billingIdentityNumber: z.string().trim().max(20).optional().or(z.literal("")),
  billingTaxOffice: z.string().trim().max(100).optional().or(z.literal("")),
  billingSameAsShipping: z.boolean().default(true),
  billingAddressCity: z.string().trim().max(100).optional().or(z.literal("")),
  billingAddressDistrict: z.string().trim().max(100).optional().or(z.literal("")),
  billingAddressLine: z.string().trim().max(500).optional().or(z.literal("")),
  /**
   * "Aboneler" indirim sistemi — opsiyonel. Sadece ŞEKİL doğrulanıyor
   * (uzunluk), geçerlilik (var mı/aktif mi/süresi geçmiş mi/bu mağazaya mı
   * ait) createOrderAction içinde lib/commerce/discounts.ts'in
   * resolveApplicableDiscount'ı ile SERVER-SIDE kontrol ediliyor — tıpkı
   * fiyatlandırmanın kendisi gibi, client'tan gelen hiçbir indirim iddiasına
   * güvenilmiyor.
   */
  discountCode: z.string().trim().max(50).optional().or(z.literal("")),
}).superRefine((values, ctx) => {
  const identity = (values.billingIdentityNumber ?? "").replace(/\s+/g, "");
  if (values.billingType === "corporate") {
    if (!values.billingName) {
      ctx.addIssue({ code: "custom", path: ["billingName"], message: "Kurumsal faturada firma ünvanı zorunlu." });
    }
    if (!DIGITS_10.test(identity)) {
      ctx.addIssue({ code: "custom", path: ["billingIdentityNumber"], message: "Vergi numarası 10 haneli olmalı." });
    }
    if (!values.billingTaxOffice) {
      ctx.addIssue({ code: "custom", path: ["billingTaxOffice"], message: "Vergi dairesi zorunlu." });
    }
  } else if (identity && !DIGITS_11.test(identity)) {
    ctx.addIssue({ code: "custom", path: ["billingIdentityNumber"], message: "TC kimlik numarası 11 haneli olmalı." });
  }
  if (!values.billingSameAsShipping) {
    if (!values.billingAddressCity || !values.billingAddressDistrict || !values.billingAddressLine) {
      ctx.addIssue({ code: "custom", path: ["billingAddressLine"], message: "Fatura adresi için il, ilçe ve adres zorunlu." });
    }
  }
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

/**
 * FAZ 2 — the wire format the client cart submits, ids + quantity ONLY.
 * `productSlug` (not a raw productId) is what the client already has in
 * every CartItem (see cart-context.tsx) and lets the server re-resolve
 * the product fresh via the SAME getPublicProductBySlug every page load
 * already uses, rather than trusting a client-supplied id directly.
 * NO price/name/label field is accepted here at all — createOrderAction
 * re-derives every one of those server-side.
 */
export const orderCartLineSchema = z.object({
  productSlug: z.string().trim().min(1).max(150),
  variantId: z.string().uuid().nullable(),
  addonIds: z.array(z.string().uuid()).max(50),
  quantity: z.coerce.number().int().min(1, "Adet en az 1 olmalı.").max(999),
});

export const orderCartLinesSchema = z.array(orderCartLineSchema).min(1, "Sepetiniz boş.").max(100);

export type OrderCartLine = z.infer<typeof orderCartLineSchema>;

/**
 * "Siparişlerim" — misafir (üye olmayan) sipariş sorgusu. İki alan: sipariş
 * kodu (orders.order_number, global unique) + sipariş verirken girilen
 * telefon. SADECE şekil doğrulanıyor burada — gerçek eşleşme (doğru kod +
 * doğru telefon mu) lib/commerce/public/order-lookup.ts'te server-side,
 * normalize edilmiş karşılaştırmayla yapılıyor (bkz. o dosyanın kendi doc
 * comment'i). Eşleşmeyen HER durum (kod yok / telefon tutmuyor) actions.ts'te
 * TEK VE AYNI genel hata mesajına düşüyor — enumeration'a karşı, hangi
 * alanın yanlış olduğu asla ayrı ayrı belirtilmiyor.
 */
export const guestOrderLookupSchema = z.object({
  orderNumber: z.coerce.number().int().positive({ message: "Sipariş bulunamadı, bilgileri kontrol edin." }),
  phone: z.string().trim().min(1, "Sipariş bulunamadı, bilgileri kontrol edin."),
});
