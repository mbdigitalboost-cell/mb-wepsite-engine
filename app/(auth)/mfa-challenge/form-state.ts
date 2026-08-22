/** See app/(auth)/login/form-state.ts for why this lives outside the "use server" actions.ts. */
export interface MfaChallengeState {
  error: string | null;
}

export const initialMfaChallengeState: MfaChallengeState = { error: null };
