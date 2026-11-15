/**
 * Faz 30 — TR IBAN doğrulama (ISO 13616 mod-97) ve maskeleme (saf, testli).
 * TR IBAN: "TR" + 2 kontrol hanesi + 5 hane banka kodu + 1 rezerv + 16 hane
 * hesap = 26 karakter.
 */

export function normalizeIban(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidTrIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^TR\d{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

/** "TR12 **** **** **** **** **12 34" — yalnız ilk 4 ve son 4 karakter. */
export function maskIban(raw: string): string {
  const iban = normalizeIban(raw);
  if (iban.length < 8) return "****";
  return `${iban.slice(0, 4)} **** **** **** **** **${iban.slice(-4, -2)} ${iban.slice(-2)}`;
}

export function formatIban(raw: string): string {
  return normalizeIban(raw).replace(/(.{4})/g, "$1 ").trim();
}
