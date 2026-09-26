import { z } from "zod";

/**
 * FAZ 5.1 — storefront customer signup (app/store/[storeSlug]/hesap/kayit).
 * Email+password only, matching the spec's own "e-posta+şifre kayıt formu"
 * exactly — no name/phone field here (store_customers.phone stays null
 * until a future phase, see migration 0031's own comment). Login reuses
 * lib/validation/auth.ts's existing loginFormSchema unchanged (identical
 * email/password shape, no need for a second copy).
 *
 * min(8) on password is stricter than Supabase Auth's own default minimum
 * (6) — a deliberate slightly-higher floor for new customer accounts, not
 * a requirement Supabase itself enforces, so this schema is the only place
 * that actually blocks a shorter password.
 */
export const storeSignupFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").max(255),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(128),
});

export type StoreSignupFormInput = z.infer<typeof storeSignupFormSchema>;

/** Backs app/store/[storeSlug]/hesap/sifremi-unuttum's request form — email only. */
export const storePasswordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").max(255),
});

export type StorePasswordResetRequestInput = z.infer<typeof storePasswordResetRequestSchema>;
