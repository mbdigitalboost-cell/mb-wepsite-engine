"use client";

import { useFormStatus } from "react-dom";

/**
 * Faz 30 — onay penceresi olan gönder butonu (Faz 29: onay metninde müşteri
 * adı). Gönderim sürerken devre dışı (çift tıklamayla iki kez işlem yok).
 */
export function ConfirmSubmitButton({
  label,
  confirmText,
  variant = "primary",
  name,
  value,
}: {
  label: string;
  confirmText: string;
  variant?: "primary" | "outline" | "danger";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const classes = {
    primary: "bg-brand-accent text-white hover:opacity-90",
    outline: "border border-black/15 text-foreground hover:border-black/30",
    danger: "border border-red-300 text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className={`inline-flex h-9 items-center rounded-md px-4 text-sm font-medium disabled:opacity-50 ${classes}`}
    >
      {pending ? "İşleniyor…" : label}
    </button>
  );
}
