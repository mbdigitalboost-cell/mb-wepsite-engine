/** See app/dashboard/customers/form-state.ts for why this lives outside the "use server" actions.ts — this one was a pre-existing latent instance of the same issue, fixed alongside the Phase 4 ones. */
export interface LoginState {
  error: string | null;
}

export const initialLoginState: LoginState = { error: null };
