/** See app/store/[storeSlug]/hesap/form-state.ts for why this lives outside actions.ts. */
export interface UpdatePasswordState {
  error: string | null;
}

export const initialUpdatePasswordState: UpdatePasswordState = { error: null };
