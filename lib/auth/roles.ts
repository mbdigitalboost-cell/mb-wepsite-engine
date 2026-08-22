import type { AppRole } from "@/lib/supabase/types";

/**
 * Phase 1 RBAC genişlemesi (PHASE_0 audit'in "Authorization/RBAC"
 * bölümü). Migration 0005 `app_role` enum'unu admin/customer'dan
 * super_admin/platform_admin/store_admin/store_editor/store_viewer'a
 * genişletiyor; bu dosya o genişlemenin UYGULAMA tarafındaki TEK gerçek
 * kaynağı — hiçbir yerde ham `role === "admin"` / `role === "customer"`
 * karşılaştırması kalmamalı, hepsi bu üç yardımcıdan geçmeli. Bu sayede
 * ileride 6. bir rol eklenirse tek bir dosya güncellenir.
 *
 * Bugün gerçekte var olan tam olarak 2 hesap şu şekilde eşleniyor:
 *   eski "admin"    → yeni "platform_admin"  (isAdminRole → true)
 *   eski "customer" → yeni "store_admin"     (isStoreRole/isStoreWriteRole → true)
 *
 * "super_admin" ADMIN_ROLES içinde ama bugün hiçbir satırda kullanılmıyor
 * ve platform_admin'den FARKLI/EK bir yetki taşımıyor — sadece ileride
 * (ör. "MB Digital Boost'un kendi platform ekibi" ile "bir müşterinin
 * kendi admin'i" ayrımı gerektiğinde) davranış eklenebilecek boş bir
 * etiket. "store_editor" de STORE_WRITE_ROLES içinde ama henüz hiçbir
 * davetiye/rol formu bu değeri üretmiyor (bkz. app/dashboard/users/role-form.tsx
 * yorumu) — şema hazır, UI Phase 2'de gelecek.
 */
export const ADMIN_ROLES = ["admin", "super_admin", "platform_admin"] as const satisfies readonly AppRole[];
export const STORE_ROLES = [
  "customer",
  "store_admin",
  "store_editor",
  "store_viewer",
] as const satisfies readonly AppRole[];
export const STORE_WRITE_ROLES = ["store_admin", "store_editor"] as const satisfies readonly AppRole[];

export function isAdminRole(role: AppRole): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export function isStoreRole(role: AppRole): boolean {
  return (STORE_ROLES as readonly string[]).includes(role);
}

export function isStoreWriteRole(role: AppRole): boolean {
  return (STORE_WRITE_ROLES as readonly string[]).includes(role);
}
