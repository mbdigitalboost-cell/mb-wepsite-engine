/**
 * Faz 29 — `fromName`: alıcının gördüğü gönderen adı (ör. mağaza adı). Adres
 * platformun doğrulanmış göndericisi kalır; ad mağazaya göre değişir, böylece
 * bir mağazanın müşterisine "MB Digital Boost" ya da başka bir mağazanın adı
 * görünmez.
 */
export function formatFromAddress(configured: string, fromName?: string): string {
  if (!fromName) return configured;
  const address = configured.match(/<([^>]+)>/)?.[1] ?? configured.trim();
  const safeName = fromName.replace(/["<>\r\n]/g, "").trim();
  return safeName ? `"${safeName}" <${address}>` : configured;
}
