"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/tracking/track";
import { discoveryRequestSchema } from "@/lib/validation/discovery-request";
import { petraSolutions } from "@/lib/data/petra/solutions";

type Status = "idle" | "submitting" | "success" | "error";

const inputClasses =
  "w-full rounded-[var(--radius-brand)] border border-white/15 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 focus-visible:border-brand-primary focus-visible:outline-none";

/**
 * Discovery request ("Keşif Talep Et") form. Client-side validation via
 * the same zod schema as the server route gives instant feedback; the
 * server route (app/api/forms/discovery-request/route.ts) re-validates
 * everything and is the only check that's actually trusted.
 */
export function DiscoveryRequestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      service: String(formData.get("service") ?? "") || undefined,
      message: String(formData.get("message") ?? ""),
      company: String(formData.get("company") ?? ""), // honeypot
    };

    const parsed = discoveryRequestSchema.safeParse(values);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/forms/discovery-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();

      if (response.ok && result.ok) {
        setStatus("success");
        track("quote_request", { source: "discovery_request_form", service: parsed.data.service });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-[var(--radius-brand)] border border-white/15 p-8 text-center">
        <p className="text-white">Talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor={`${formId}-fullName`} className="mb-2 block text-sm font-medium text-white">
          Ad Soyad
        </label>
        <input
          id={`${formId}-fullName`}
          name="fullName"
          type="text"
          required
          autoComplete="name"
          className={inputClasses}
          aria-invalid={Boolean(fieldErrors.fullName)}
          aria-describedby={fieldErrors.fullName ? `${formId}-fullName-error` : undefined}
        />
        {fieldErrors.fullName ? (
          <p id={`${formId}-fullName-error`} className="mt-1 text-xs text-brand-primary">
            {fieldErrors.fullName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-phone`} className="mb-2 block text-sm font-medium text-white">
          Telefon
        </label>
        <input
          id={`${formId}-phone`}
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          className={inputClasses}
          aria-invalid={Boolean(fieldErrors.phone)}
          aria-describedby={fieldErrors.phone ? `${formId}-phone-error` : undefined}
        />
        {fieldErrors.phone ? (
          <p id={`${formId}-phone-error`} className="mt-1 text-xs text-brand-primary">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-email`} className="mb-2 block text-sm font-medium text-white">
          E-posta <span className="text-white/40">(opsiyonel)</span>
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          className={inputClasses}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${formId}-email-error` : undefined}
        />
        {fieldErrors.email ? (
          <p id={`${formId}-email-error`} className="mt-1 text-xs text-brand-primary">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-service`} className="mb-2 block text-sm font-medium text-white">
          Hizmet <span className="text-white/40">(opsiyonel)</span>
        </label>
        <select id={`${formId}-service`} name="service" className={inputClasses}>
          <option value="">Seçiniz</option>
          {petraSolutions.map((solution) => (
            <option key={solution.slug} value={solution.slug}>
              {solution.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${formId}-message`} className="mb-2 block text-sm font-medium text-white">
          Mesaj <span className="text-white/40">(opsiyonel)</span>
        </label>
        <textarea id={`${formId}-message`} name="message" rows={4} className={inputClasses} />
      </div>

      {/* Honeypot — hidden from real users, real bots often fill every field they find. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor={`${formId}-company`}>Şirket</label>
        <input id={`${formId}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" ? (
        <p role="alert" className="text-sm text-brand-primary">
          Bir şeyler ters gitti, lütfen tekrar deneyin.
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={status === "submitting"} className="w-full sm:w-auto">
        {status === "submitting" ? "Gönderiliyor..." : "Talebi Gönder"}
      </Button>
    </form>
  );
}
