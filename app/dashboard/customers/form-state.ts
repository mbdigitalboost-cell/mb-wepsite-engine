/**
 * Split out from actions.ts on purpose: a `"use server"` file may only
 * export async functions (Next 16 enforces this at build time — see
 * node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md).
 * `initialCustomerFormState` is a plain object, so it — and the state
 * type it satisfies — live here instead, imported by both actions.ts
 * (for the type) and the client forms (for the type + initial value).
 */
export interface CustomerFormState {
  error: string | null;
}

export const initialCustomerFormState: CustomerFormState = { error: null };
