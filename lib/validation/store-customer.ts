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
