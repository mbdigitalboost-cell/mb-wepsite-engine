"use client";

import { useActionState, useId, useState } from "react";
import { changeUserRoleAction } from "./actions";
import { initialRoleFormState } from "./form-state";

const selectClasses =
  "rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-xs text-foreground focus-visible:border-foreground/40 focus-visible:outline-none";

interface RoleFormProps {
  membershipId: string;
  currentRole: "admin" | "customer";
  currentCustomerId: string | null;
  customers: { id: string; name: string }[];
}

/**
 * One inline row-level form per membership, not a full page reload — kept
 * as a plain Server Action + `useActionState` (no client-side fetch) so
 * this still works with JS disabled, same as every other form in this
 * panel.
 */
export function RoleForm({ membershipId, currentRole, currentCustomerId, customers }: RoleFormProps) {
  const [state, formAction, pending] = useActionState(changeUserRoleAction, initialRoleFormState);
  const [role, setRole] = useState<"admin" | "customer">(currentRole);
  const formId = useId();

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <select
        aria-label="Rol"
        id={`${formId}-role`}
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as "admin" | "customer")}
        className={selectClasses}
      >
        <option value="customer">Customer</option>
        <option value="admin">Admin</option>
      </select>

      {role === "customer" ? (
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
