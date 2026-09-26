import { z } from "zod";

/**
 * FAZ 2 (mağaza sepeti/sipariş) — checkout customer info. Mirrors migration
 * 0029_orders.sql's `orders` table exactly: customerName/customerPhone
 * required, customerEmail optional, all 3 address fields required, note
 * optional. storeId/subtotal/status are NEVER fields here — those come
 * from the route (storeSlug -> resolved store) and the server's own
 * price recomputation (lib/commerce/pricing.ts), never from client input.
 */
export const checkoutFormSchema = z.object({
  customerName: z.string().trim().min(1, "Ad soyad zorunlu.").max(200),
  customerPhone: z.string().trim().min(1, "Telefon zorunlu.").max(30),
  customerEmail: z.string().trim().email("Geçerli bir e-posta girin.").max(255).optional().or(z.literal("")),
  addressCity: z.string().trim().min(1, "Şehir zorunlu.").max(100),
  addressDistrict: z.string().trim().min(1, "İlçe zorunlu.").max(100),
  addressLine: z.string().trim().min(1, "Adres zorunlu.").max(500),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
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
