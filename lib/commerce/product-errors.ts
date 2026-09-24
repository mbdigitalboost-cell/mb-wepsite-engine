/**
 * Shared by products/actions.ts and products/import/actions.ts.
 *
 * Deliberately lives OUTSIDE any "use server" file: Next.js requires every
 * top-level export of a "use server" file to be an async Server Action, so
 * this synchronous helper can never be exported directly from actions.ts
 * itself (`export function toFriendlyError` there broke `next build` with
 * "Server Actions must be async functions" the moment the import feature
 * tried to reuse it — moving it here is the fix, not wrapping it async).
 *
 * Postgres unique_violation (23505) on products_slug_unique / _sku_unique /
 * _barcode_unique (all (store_id, col)) -> distinct friendly messages, per
 * constraint name in the error message (same technique every
 * PostgrestError-consuming action in this codebase relies on since the
 * client doesn't expose a structured constraint field). Anything else falls
 * back to a generic `Kaydedilemedi: ${error.message}` shape.
 */
export function toFriendlyError(error: { code?: string | null; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("products_slug_unique")) return "Bu slug bu mağazada zaten kullanılıyor.";
    if (error.message.includes("products_sku_unique")) return "Bu SKU bu mağazada zaten kullanılıyor.";
    if (error.message.includes("products_barcode_unique")) return "Bu barkod bu mağazada zaten kullanılıyor.";
    return "Bu değer bu mağazada zaten kullanılıyor.";
  }
  return `Kaydedilemedi: ${error.message}`;
}
