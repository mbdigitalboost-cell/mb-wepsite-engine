import { z } from "zod";

/**
 * FAZ 5.1 — storefront customer signup (app/store/[storeSlug]/hesap/kayit).
 * Login reuses lib/validation/auth.ts's existing loginFormSchema unchanged
 * (identical email/password shape, no need for a second copy).
 *
 * min(8) on password is stricter than Supabase Auth's own default minimum
 * (6) — a deliberate slightly-higher floor for new customer accounts, not
 * a requirement Supabase itself enforces, so this schema is the only place
 * that actually blocks a shorter password.
 *
 * FAZ 5.1b — fullName + address fields added (migration 0032). The
 * address rules (min(1)+max length, same Turkish messages) are a
 * deliberate copy of checkoutFormSchema's own addressCity/addressDistrict/
 * addressNeighborhood/addressLine (lib/validation/order.ts), NOT a
 * `.pick()`/`.merge()` composition — kept as plain duplicated one-liners
 * because zod v4 (this project's installed version) reworked object
 * composition APIs enough that chaining across two schema files wasn't
 * worth the risk for four short field validators; if checkout's own
 * address rules ever change, this block needs updating too.
 */
export const storeSignupFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").max(255),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(128),
  fullName: z.string().trim().min(1, "Ad soyad zorunlu.").max(200),
  addressCity: z.string().trim().min(1, "İl zorunlu.").max(100),
  addressDistrict: z.string().trim().min(1, "İlçe zorunlu.").max(100),
  addressNeighborhood: z.string().trim().min(1, "Mahalle zorunlu.").max(150),
  addressLine: z.string().trim().min(1, "Adres zorunlu.").max(500),
});

export type StoreSignupFormInput = z.infer<typeof storeSignupFormSchema>;

/** Backs app/store/[storeSlug]/hesap/sifremi-unuttum's request form — email only. */
export const storePasswordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").max(255),
});

export type StorePasswordResetRequestInput = z.infer<typeof storePasswordResetRequestSchema>;

/**
 * FAZ 6.2 — backs app/store/[storeSlug]/hesap/adreslerim's add/edit forms
 * (migration 0033's store_customer_addresses). label/recipientName/phone
 * are genuinely optional (`.optional().or(z.literal(""))`, same pattern
 * as checkoutFormSchema's own customerEmail/note in lib/validation/order.ts)
 * — the address form sends "" for an empty optional field, not omit it.
 *
 * addressCity/addressDistrict/addressNeighborhood/addressLine use the
 * EXACT same required-ness and messages as storeSignupFormSchema's own
 * copy above (itself a deliberate copy of checkoutFormSchema's rules) —
 * migration 0033 marks address_neighborhood nullable at the DB level, but
 * this schema still requires it: a Turkish delivery address needs a
 * mahalle in practice, matching every other address form in this
 * codebase (checkout, signup) that also requires it despite the same
 * DB-level nullability.
 */
export const storeAddressFormSchema = z.object({
  label: z.string().trim().max(50, "Etiket çok uzun.").optional().or(z.literal("")),
  recipientName: z.string().trim().max(200, "Alıcı adı çok uzun.").optional().or(z.literal("")),
  phone: z.string().trim().max(30, "Telefon çok uzun.").optional().or(z.literal("")),
  addressCity: z.string().trim().min(1, "İl zorunlu.").max(100),
  addressDistrict: z.string().trim().min(1, "İlçe zorunlu.").max(100),
  addressNeighborhood: z.string().trim().min(1, "Mahalle zorunlu.").max(150),
  addressLine: z.string().trim().min(1, "Adres zorunlu.").max(500),
});

export type StoreAddressFormInput = z.infer<typeof storeAddressFormSchema>;
