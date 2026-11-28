"use client";

import { useFormStatus } from "react-dom";

/**
 * Sunucu bileşeni olan ayar kartlarındaki (<form action={serverAction}>)
 * gönder düğmesi. Gönderim sürerken düğme devre dışı kalır ve metni
 * değişir ("Kaydediliyor…"): kullanıcı işlemin başladığını görür ve aynı
 * formu art arda gönderemez (Faz 18'deki "Uygula" düğmesiyle aynı desen).
 *
 * useFormStatus yalnız çevreleyen <form>'un ALT bileşeninde çalışır; bu
 * yüzden düğme ayrı bir istemci bileşenidir, kartın kendisi sunucu
 * bileşeni kalır.
 */
export function PendingSubmitButton({
  label,
  pendingLabel = "Kaydediliyor…",
  className,
  disabled = false,
}: {
  label: string;
  pendingLabel?: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} aria-busy={pending} className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}>
      {pending ? pendingLabel : label}
    </button>
  );
}
