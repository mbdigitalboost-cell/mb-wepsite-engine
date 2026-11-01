"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { createUserAction } from "./actions";
import { initialCreateUserFormState } from "./form-state";
import { inputClasses } from "@/lib/utils/input-classes";
import { TempPasswordReveal } from "./temp-password-reveal";

interface CreateUserFormProps {
  customers: { id: string; name: string }[];
}

/**
 * Admin Kullanıcı Oluşturma devir metni — eski InviteForm'un (e-posta
 * davet akışı) yerini aldı. Davranış farkı: kullanıcı artık submit
 * sonrası bir "davet gönderildi" mesajı değil, TempPasswordReveal ile
 * gerçek geçici şifreyi görüyor.
 */
export function CreateUserForm({ customers }: CreateUserFormProps) {
  const [state, formAction, pending] = useActionState(createUserAction, initialCreateUserFormState);
  // Phase 1 RBAC genişlemesi: eski "admin"/"customer" değerleri
  // "platform_admin"/"store_admin" oldu (bkz. lib/auth/roles.ts +
  // lib/validation/invite.ts). Görünen etiketler de aynı şekilde
  // güncellendi ki form gerçekte ne oluşturduğunu doğru söylesin.
  const [role, setRole] = useState<"platform_admin" | "store_admin">("store_admin");
  const formId = useId();

  return (
    <div className="max-w-md space-y-4">
      <form action={formAction} className="space-y-4">
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
            onChange={(event) => setRole(event.target.value as "platform_admin" | "store_admin")}
            className={inputClasses}
          >
            <option value="store_admin">Store Admin (müşteriye özel)</option>
            <option value="platform_admin">Platform Admin (tüm müşteriler)</option>
          </select>
        </div>

        {role === "store_admin" ? (
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

        <Button type="submit" disabled={pending}>
          {pending ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
        </Button>
      </form>

      {state.success ? <TempPasswordReveal email={state.success.email} tempPassword={state.success.tempPassword} /> : null}
    </div>
  );
}
