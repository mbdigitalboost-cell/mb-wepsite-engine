"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Faz 37 — "Yeni Ürün": gönderim sürerken devre dışı (çift tıklamayla iki
 * taslak açılmaz). Sunucu ayrıca aynı kullanıcının son 30 dakikadaki boş
 * taslağına yönlendirir (createDraftProductAction).
 */
export function NewProductButton({ label = "Yeni Ürün" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Açılıyor…" : label}
    </Button>
  );
}
