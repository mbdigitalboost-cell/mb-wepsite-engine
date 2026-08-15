/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface SetPasswordState {
  error: string | null;
}

export const initialSetPasswordState: SetPasswordState = { error: null };
