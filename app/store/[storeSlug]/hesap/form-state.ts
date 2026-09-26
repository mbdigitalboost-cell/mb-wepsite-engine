/**
 * FAZ 5.1 — lives outside actions.ts because that file is "use server":
 * every top-level export of a "use server" file must be an async Server
 * Action, and these are plain consts (same pattern as every other
 * form-state.ts in this codebase, e.g. app/store/[storeSlug]/sepet/form-state.ts).
 */
export interface StoreSignupState {
  status: "idle" | "error" | "confirm_email" | "success";
  error: string | null;
}

export const initialStoreSignupState: StoreSignupState = { status: "idle", error: null };

export interface StoreLoginState {
  error: string | null;
}

export const initialStoreLoginState: StoreLoginState = { error: null };
