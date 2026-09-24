/**
 * Deliberately NOT a "use client" file: [productId]/page.tsx (a Server
 * Component) needs to call isProductTabKey() while resolving `?tab=` on
 * the server, before anything is sent to the client. Both `ProductTabKey`
 * and `isProductTabKey` used to live in product-tabs.tsx, which IS
 * "use client" — that made page.tsx's server-side call a "call a client
 * function from the server" runtime error (500 on every product detail
 * page), never caught by tsc/build because "use client" doesn't change a
 * function's TYPE, only where it's allowed to run.
 *
 * Same fix pattern as lib/commerce/product-errors.ts (toFriendlyError
 * pulled out of a "use server" file because Next.js requires every
 * top-level export there to be an async Server Action) — here it's the
 * mirror case: a value a Server Component needs pulled out of a
 * "use client" file, into a plain module either side can import.
 */
export type ProductTabKey = "basic" | "images" | "variants" | "addons";

export function isProductTabKey(value: string | undefined): value is ProductTabKey {
  return value === "basic" || value === "images" || value === "variants" || value === "addons";
}
