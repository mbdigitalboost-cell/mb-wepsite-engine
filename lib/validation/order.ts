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
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "Geçerli bir ödeme yöntemi seçin." }),
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
