/** Shared so layout.tsx and page.tsx (and any future page) derive the same wa.me link from one place. */
export function buildWhatsappHref(rawNumber: string | null): string | null {
  if (!rawNumber) return null;
  return `https://wa.me/${rawNumber.replace(/\D/g, "")}`;
}
