"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { createWebsiteAction } from "../actions";
import { initialWebsiteFormState } from "../form-state";
import { inputClasses } from "@/lib/utils/input-classes";

export function WebsiteForm({ customerId }: { customerId: string }) {
  const action = createWebsiteAction.bind(null, customerId);
  const [state, formAction, pending] = useActionState(action, initialWebsiteFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm font-medium text-foreground">
          Website Adı
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          required
          placeholder="Petra Kurumsal Web"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-slug`} className="mb-1.5 block text-sm font-medium text-foreground">
          Slug
        </label>
        <input
          id={`${formId}-slug`}
          name="slug"
          type="text"
          required
          placeholder="petra-kurumsal-web"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-domain`} className="mb-1.5 block text-sm font-medium text-foreground">
          Domain <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-domain`}
          name="domain"
          type="text"
          placeholder="petramuhendislik.com.tr"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-template`} className="mb-1.5 block text-sm font-medium text-foreground">
          Şablon <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-template`}
          name="template"
          type="text"
          placeholder="petra"
          className={inputClasses}
        />
      </div>

      <div>
        <label
          htmlFor={`${formId}-connectionKey`}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Supabase Connection Key
        </label>
        <input
          id={`${formId}-connectionKey`}
          name="supabaseConnectionKey"
          type="text"
          required
          placeholder="PETRA"
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">
          Bu müşterinin kendi Supabase projesini tanımlayan kısa kod (örn:
          PETRA). Gerçek Supabase URL/anahtar burada değil, yalnızca Vercel
          ortam değişkenlerinde tutulur.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Oluşturuluyor..." : "Website Oluştur"}
      </Button>
    </form>
  );
}
