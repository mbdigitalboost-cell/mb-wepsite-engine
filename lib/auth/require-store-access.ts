import "server-only";

import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireSession } from "@/lib/auth/require-session";
import { requireAal2 } from "@/lib/auth/require-aal2";
import { getCurrentMemberships } from "@/lib/auth/get-memberships";
import { isAdminRole, isStoreRole, isStoreWriteRole, isStoreAdminTierRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface StoreAccessContext {
  user: User;
  isAdmin: boolean;
  /** The store's customer_id — every caller needs this to also scope its own queries/URLs correctly. */
  customerId: string;
}

/**
 * PHASE 2 — store_id tabanlı erişim kapıları, `lib/auth/require-customer-access.ts`'in
 * (Phase 1) doğrudan devamı. Üç kademe, migration 0008'in DB fonksiyonlarıyla
 * BİREBİR aynı isimlendirme ve aynı rol mantığı (uygulama + RLS AYNI
 * kaynaktan — lib/auth/roles.ts — beslendiği için birbirinden asla sapmaz):
 *
 *   requireStoreAccess       -> okuma (store_viewer+)       -> is_store_member()
 *   requireStoreEditorAccess -> içerik yazma (store_editor+) -> is_store_editor_member()
 *   requireStoreAdminAccess  -> ayarlar/kritik (SADECE store_admin+) -> is_store_admin_member()
 *
 * `notFound()` kullanılıyor (bir "yetkin yok" sayfası değil) —
 * require-customer-access.ts'teki AYNI gerekçeyle: yanlış bir storeId
 * deneyen birine "var ama senin değil" ile "hiç yok" arasındaki farkı
 * söylememek için.
 *
 * ÖNEMLİ (dürüstlükle belirtilmeli, PHASE_2_FINAL_ARCHITECTURE_PLAN.md
 * §H'deki gibi): bu, hızlı/temiz bir UX kontrolü — asıl güvenlik sınırı
 * migration 0008'in RLS fonksiyonları. Bu fonksiyon hiç çağrılmasa bile
 * RLS bağımsız olarak store_profiles/store_settings/... satırlarını
 * engeller (bkz. PHASE_2_MIGRATION_TEST_REPORT.md'deki role-bazlı testler).
 */
async function resolveStoreCustomerId(storeId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("stores").select("customer_id").eq("id", storeId).maybeSingle();

  if (error) {
    console.error("[auth] failed to resolve store's customer_id:", error.message);
    return null;
  }

  return data?.customer_id ?? null;
}

export async function requireStoreAccess(storeId: string): Promise<StoreAccessContext> {
  const { user } = await requireSession();
  const customerId = await resolveStoreCustomerId(storeId);
  if (!customerId) notFound();

  const memberships = await getCurrentMemberships(user.id);
  const isAdmin = memberships.some((membership) => isAdminRole(membership.role));
  const isMember = memberships.some(
    (membership) => isStoreRole(membership.role) && membership.customerId === customerId,
  );

  if (!isAdmin && !isMember) notFound();

  return { user, isAdmin, customerId };
}

/** store_editor+ (Branding / Navigation / Homepage Builder yazma). */
export async function requireStoreEditorAccess(storeId: string): Promise<StoreAccessContext> {
  const { user } = await requireSession();
  const customerId = await resolveStoreCustomerId(storeId);
  if (!customerId) notFound();

  const memberships = await getCurrentMemberships(user.id);
  const isAdmin = memberships.some((membership) => isAdminRole(membership.role));
  const hasEditorAccess = memberships.some(
    (membership) => isStoreWriteRole(membership.role) && membership.customerId === customerId,
  );

  if (!isAdmin && !hasEditorAccess) notFound();

  return { user, isAdmin, customerId };
}

/**
 * SADECE store_admin+ (Store Profile / Store Settings / kritik ayarlar).
 * store_editor bu kapıdan GEÇEMEZ.
 *
 * PHASE 2 CRITICAL REMEDIATION (CRITICAL 2 — bkz.
 * PHASE_2_CRITICAL_REMEDIATION_PLAN.md §8-9, Authorization Level Matrix'te
 * Level 3): bu fonksiyondan geçen HER Server Action (Store Profile/Settings
 * update, kalıcı navigation/homepage silme, maintenance mode dahil) artık
 * `requireAal2()` ile korunuyor — SADECE dashboard layout'ta değil, bu
 * fonksiyonun kendi kod yolunda, her invocation'da (doğrudan Server Action
 * çağrısı layout'u hiç render etmeden bile). `requireStoreAccess()` ve
 * `requireStoreEditorAccess()` (Level 1/2, geri alınabilir okuma/içerik
 * düzenleme) BİLİNÇLİ OLARAK bu kontrolü İÇERMİYOR — bkz.
 * lib/auth/require-aal2.ts'in dosya yorumu.
 */
export async function requireStoreAdminAccess(storeId: string): Promise<StoreAccessContext> {
  const { user } = await requireSession();
  const customerId = await resolveStoreCustomerId(storeId);
  if (!customerId) notFound();

  const memberships = await getCurrentMemberships(user.id);
  const isAdmin = memberships.some((membership) => isAdminRole(membership.role));
  const hasAdminTierAccess = memberships.some(
    (membership) => isStoreAdminTierRole(membership.role) && membership.customerId === customerId,
  );

  if (!isAdmin && !hasAdminTierAccess) notFound();

  await requireAal2();

  return { user, isAdmin, customerId };
}
