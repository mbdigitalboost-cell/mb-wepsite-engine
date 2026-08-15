/**
 * Turkish long date, e.g. "15 Ağustos 2026". Used anywhere a
 * customer/website `created_at`/`updated_at` is shown in the admin panel.
 */
export function formatDateTr(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Turkish long date + time, e.g. "15 Ağustos 2026 14:32" — matches the
 * audit log example format from the Phase 4 spec exactly.
 */
export function formatDateTimeTr(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
