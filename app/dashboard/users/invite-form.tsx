"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { inviteUserAction } from "./actions";
import { initialInviteFormState } from "./form-state";

const inputClasses =
  "w-full rounded-md border border-black/15 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus-visible:border-foreground/40 focus-visible:outline-none";

interface InviteFormProps {
  customers: { id: string; name: string }[];
}

export function InviteForm({ customers }: InviteFormProps) {
  const [state, formAction, pending] = useActionState(inviteUserAction, initialInviteFormState);
  const [role, setRole] = useState<"admin" | "customer">("customer");
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-foreground">
          E-posta
        </label>
        <input id={`${formId}-email`} name="email" type="email" required className={inputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-fullName`} className="mb-1.5 block text-sm font-medium text-foreground">
          Ad Soyad
        </label>
        <input id={`${formId}-fullName`} name="fullName" type="text" required className={inputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-role`} className="mb-1.5 block text-sm font-medium text-foreground">
          Rol
        </label>
        <select
          id={`${formId}-role`}
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as "admin" | "customer")}
          className={inputClasses}
        >
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {role === "customer" ? (
        <div>
          <label htmlFor={`${formId}-customerId`} className="mb-1.5 block text-sm font-medium text-foreground">
            Müşteri
          </label>
          <select id={`${formId}-customerId`} name="customerId" required className={inputClasses}>
            <option value="">Seçin...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-foreground/50">
            Bu kullanıcı yalnızca seçilen müşterinin verilerine erişebilecek.
          </p>
        </div>
      ) : (
        <input type="hidden" name="customerId" value="" />
      )}

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Gönderiliyor..." : "Kullanıcı Davet Et"}
      </Button>
    </form>
  );
}
