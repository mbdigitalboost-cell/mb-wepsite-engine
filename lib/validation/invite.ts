import { z } from "zod";

/**
 * Backs the "Kullanıcı Davet Et" form. `role` + `customerId` together
 * decide what gets written to `customer_users`:
 *   - role "admin"    → customerId must be empty (an admin row has
 *                        customer_id = NULL, enforced by
 *                        customer_users_role_scope_check in migration 0002).
 *   - role "customer" → customerId is required.
 * That pairing is enforced by `.refine` below rather than the DB alone,
 * so the form gives a clear Turkish error instead of a raw constraint
 * violation.
 */
export const inviteUserFormSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").max(255),
    fullName: z
      .string()
      .trim()
      .min(2, "Ad soyad en az 2 karakter olmalı.")
      .max(150, "Ad soyad çok uzun."),
    role: z.enum(["admin", "customer"]),
    customerId: z.string().uuid("Geçerli bir müşteri seçin.").optional().or(z.literal("")),
  })
  .refine((value) => value.role !== "customer" || Boolean(value.customerId), {
    message: "Customer rolü için bir müşteri seçilmeli.",
    path: ["customerId"],
  })
  .refine((value) => value.role !== "admin" || !value.customerId, {
    message: "Admin rolü bir müşteriye bağlanamaz.",
    path: ["customerId"],
  });

export type InviteUserFormInput = z.infer<typeof inviteUserFormSchema>;

export const userRoleFormSchema = z
  .object({
    membershipId: z.string().uuid(),
    role: z.enum(["admin", "customer"]),
    customerId: z.string().uuid("Geçerli bir müşteri seçin.").optional().or(z.literal("")),
  })
  .refine((value) => value.role !== "customer" || Boolean(value.customerId), {
    message: "Customer rolü için bir müşteri seçilmeli.",
    path: ["customerId"],
  })
  .refine((value) => value.role !== "admin" || !value.customerId, {
    message: "Admin rolü bir müşteriye bağlanamaz.",
    path: ["customerId"],
  });

export type UserRoleFormInput = z.infer<typeof userRoleFormSchema>;

export const setPasswordFormSchema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(200),
    confirmPassword: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(200),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export type SetPasswordFormInput = z.infer<typeof setPasswordFormSchema>;
