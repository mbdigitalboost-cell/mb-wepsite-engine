/** See app/dashboard/customers/form-state.ts (Phase 4) for why this lives outside the "use server" actions.ts. */
export interface TrackingFormState {
  error: string | null;
}

export const initialTrackingFormState: TrackingFormState = { error: null };
