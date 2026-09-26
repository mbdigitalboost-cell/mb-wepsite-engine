/** See app/store/[storeSlug]/hesap/form-state.ts for why this lives outside actions.ts. */
export interface PasswordResetRequestState {
  status: "idle" | "error" | "sent";
  error: string | null;
}

export const initialPasswordResetRequestState: PasswordResetRequestState = { status: "idle", error: null };
