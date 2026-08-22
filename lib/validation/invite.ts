import { z } from "zod";

/**
 * Backs the "Kullanıcı Davet Et" form. `role` + `customerId` together
 * decide what gets written to `customer_users`:
 *   - role "platform_admin" → customerId must be empty (customer_id =
 *                             NULL, enforced by
 *                             customer_users_role_scope_check, migration
 *                             0005).
 *   - role "store_admin"    → customerId is required.
 *
 * Phase 1 RBAC genişlemesi (migration 0005_expand_roles.sql): eski
 * "admin"/"customer" değerleri "platform_admin"/"store_admin" oldu (aynı
 * davranış, yeni isim — bkz. lib/auth/roles.ts). Enum'da ayrıca
 * "super_admin"/"store_editor"/"store_viewer" de var ama bu form onları
 * BİLİNÇLİ OLARAK sunmuyor — bir rol atama arayüzü için henüz gerçek bir
 * kullanım senaryosu yok (Phase 2'nin mağaza/store yönetim UI'ı ile
 * birlikte gelecek). Şema hazır; UI kasıtlı olarak dar.
 */
export const inviteUserFormSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin.").max(255),
    fullName: z
      .string()
      .trim()
      .min(2, "Ad soyad en az 2 karakter olmalı.")
      .max(150, "Ad soyad çok uzun."),
    role: z.enum(["platform_admin", "store_admin"]),
    customerId: z.string().uuid("Geçerli bir müşteri seçin.").optional().or(z.literal("")),
  })
  .refine((value) => value.role !== "store_admin" || Boolean(value.customerId), {
    message: "Store Admin rolü için bir müşteri seçilmeli.",
    path: ["customerId"],
  })
  .refine((value) => value.role !== "platform_admin" || !value.customerId, {
    message: "Platform Admin rolü bir müşteriye bağlanamaz.",
    path: ["customerId"],
  });

export type InviteUserFormInput = z.infer<typeof inviteUserFormSchema>;

export const userRoleFormSchema = z
  .object({
    membershipId: z.string().uuid(),
    role: z.enum(["platform_admin", "store_admin"]),
    customerId: z.string().uuid("Geçerli bir müşteri seçin.").optional().or(z.literal("")),
    /**
     * Phase 1 (PHASE_0 audit — "en yüksek riskli işlem şifre onayı
     * olmadan yapılabiliyor" bulgusu): bir admin, başka bir kullanıcının
     * (ya da kendisinin) rolünü değiştirirken kendi şifresini yeniden
     * girmek zorunda — bkz. lib/auth/reauthenticate.ts. Bu, çalınmış/
     * kilitli bırakılmış bir tarayıcı oturumunun sessizce yeni bir
     * platform admin yaratmasını engelliyor.
     */
    currentPassword: z.string().min(1, "Onay için şifrenizi girin."),
  })
  .refine((value) => value.role !== "store_admin" || Boolean(value.customerId), {
    message: "Store Admin rolü için bir müşteri seçilmeli.",
    path: ["customerId"],
  })
  .refine((value) => value.role !== "platform_admin" || !value.customerId, {
    message: "Platform Admin rolü bir müşteriye bağlanamaz.",
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
