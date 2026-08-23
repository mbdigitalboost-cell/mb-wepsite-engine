"use client";

import { useActionState, useId, useState } from "react";
import { changeUserRoleAction } from "./actions";
import { initialRoleFormState } from "./form-state";
import { isAdminRole } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/supabase/types";

const selectClasses =
  "rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-xs text-foreground focus-visible:border-foreground/40 focus-visible:outline-none";

type SelectableRole = "platform_admin" | "store_admin";

interface RoleFormProps {
  membershipId: string;
  /**
   * Phase 1 RBAC genişlemesi öncesi taşınmamış satırlar hâlâ eski
   * "admin"/"customer" etiketini taşıyabilir (migration 0006 uygulanana
   * kadar — 0005 sadece enum'a yeni değerler ekliyor, veri taşıması
   * 0006'da) — bu yüzden burası tam `AppRole` kabul ediyor, sadece
   * `isAdminRole()` ile iki-seçenekli forma normalize ediliyor. Formu
   * kaydetmek her zaman YENİ etiketle (platform_admin/store_admin) yazar.
   */
  currentRole: AppRole;
  currentCustomerId: string | null;
  customers: { id: string; name: string }[];
}

/**
 * One inline row-level form per membership, not a full page reload — kept
 * as a plain Server Action + `useActionState` (no client-side fetch) so
 * this still works with JS disabled, same as every other form in this
 * panel.
 *
 * Phase 1: artık kendi şifresini de isteyen bir alan içeriyor — bkz.
 * app/dashboard/users/actions.ts'teki changeUserRoleAction yorumu
 * (PHASE_0 audit bulgusu: rol değişikliği platformdaki en riskli tek
 * işlem, bu yüzden ek bir şifre onayı istiyor).
 */
export function RoleForm({ membershipId, currentRole, currentCustomerId, customers }: RoleFormProps) {
  const [state, formAction, pending] = useActionState(changeUserRoleAction, initialRoleFormState);
  const [role, setRole] = useState<SelectableRole>(isAdminRole(currentRole) ? "platform_admin" : "store_admin");
  const formId = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <select
        aria-label="Rol"
        id={`${formId}-role`}
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as SelectableRole)}
        className={selectClasses}
      >
        <option value="store_admin">Store Admin</option>
        <option value="platform_admin">Platform Admin</option>
      </select>

      {role === "store_admin" ? (
        <select
          aria-label="Müşteri"
          name="customerId"
          defaultValue={currentCustomerId ?? ""}
          required
          className={selectClasses}
        >
          <option value="">Seçin...</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="customerId" value="" />
      )}

      <input
        aria-label="Şifreniz (onay)"
        name="currentPassword"
        type="password"
        required
        placeholder="Şifreniz (onay)"
        autoComplete="current-password"
        className={selectClasses}
      />

      <button
        type="submit"
        disabled={pending}
        className="text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>

      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
